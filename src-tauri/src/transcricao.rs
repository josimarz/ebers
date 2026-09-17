//! Transcrição de voz offline da Consulta (spec 2.3 e 5.3; ADR-0004; issue #10).
//!
//! O frontend capta o áudio, junta em trechos e manda os bytes crus para cá;
//! o whisper.cpp (via whisper-rs) transcreve 100% local, em pt-BR. O modelo
//! ggml vem embutido no app, em `modelos/` dentro dos recursos do bundle
//! (ADR-0008); um modelo posto em `modelos/` ao lado do `ebers.db` tem
//! precedência — a exceção para a máquina que não acompanha o `small`.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters,
};

/// Subdiretório dos modelos Whisper — tanto na pasta de dados do app quanto
/// nos recursos do bundle.
pub const DIRETORIO_MODELOS: &str = "modelos";

/// Modelos aceitos, do melhor para o mais leve. O `small` vai embutido no app
/// (ADR-0008); um mais leve posto em `modelos/` da pasta de dados sobrepõe o
/// embutido (README, seção Dados). Havendo mais de um no mesmo diretório,
/// prevalece a qualidade.
pub const MODELOS_POR_QUALIDADE: [&str; 3] =
    ["ggml-small.bin", "ggml-base.bin", "ggml-tiny.bin"];

/// Taxa de amostragem que o whisper.cpp espera (16 kHz mono).
pub const TAXA_AMOSTRAGEM: usize = 16000;

/// Se a inferência pode ir para a GPU.
///
/// O único backend de GPU que o projeto compila é o Metal, no macOS
/// (Cargo.toml) — e ele só é confiável nas GPUs da Apple. Num Mac Intel a GPU
/// é AMD/Intel e não tem `simdgroup matrix mul`; por ali os kernels do ggml
/// devolvem transcrição ilegível — tokens soltos em outros idiomas, diferentes
/// a cada execução, sem erro nenhum que denuncie a falha. Medido num
/// i7-9750H/Radeon Pro 5300M com o modelo `base`: na GPU, "-" e "ăиче" para a
/// mesma frase que a CPU transcreve inteira e de forma estável.
///
/// A CPU dá conta com folga: ~3,7× mais rápido que o tempo real nessa mesma
/// máquina, bem dentro do ditado da Consulta.
pub const USAR_GPU: bool = cfg!(all(target_os = "macos", target_arch = "aarch64"));

/// Amostras na duração mínima segura: 1,1 s — o whisper.cpp rejeita áudio
/// com menos de ~1 s.
const DURACAO_MINIMA_AMOSTRAS: usize = TAXA_AMOSTRAGEM + TAXA_AMOSTRAGEM / 10;

/// Localiza o melhor modelo presente no diretório de modelos.
pub fn localizar_modelo(diretorio: &Path) -> Option<PathBuf> {
    MODELOS_POR_QUALIDADE
        .iter()
        .map(|nome| diretorio.join(nome))
        .find(|caminho| caminho.is_file())
}

/// O melhor modelo de cada diretório, na ordem em que os diretórios vieram.
/// Essa ordem é de precedência, não de qualidade: um `base` posto de
/// propósito em `modelos/` da pasta de dados vem antes do `small` embutido
/// no app (ADR-0008). Os seguintes são reserva: se o primeiro não carregar
/// (arquivo truncado por um download interrompido, por exemplo), a
/// transcrição tenta o próximo em vez de ficar sem modelo.
pub fn candidatos_a_modelo(diretorios: &[PathBuf]) -> Vec<PathBuf> {
    diretorios
        .iter()
        .filter_map(|diretorio| localizar_modelo(diretorio))
        .collect()
}

/// O modelo de maior precedência entre os diretórios, se houver algum.
pub fn localizar_modelo_entre(diretorios: &[PathBuf]) -> Option<PathBuf> {
    candidatos_a_modelo(diretorios).into_iter().next()
}

/// Decodifica o corpo bruto do invoke: amostras f32 little-endian.
pub fn amostras_do_corpo(bytes: &[u8]) -> Result<Vec<f32>, String> {
    if !bytes.len().is_multiple_of(4) {
        return Err(format!(
            "Áudio inválido: {} bytes não formam amostras f32 inteiras",
            bytes.len()
        ));
    }
    Ok(bytes
        .chunks_exact(4)
        .map(|pedaco| f32::from_le_bytes([pedaco[0], pedaco[1], pedaco[2], pedaco[3]]))
        .collect())
}

/// Decodifica as amostras f32 LE mandadas como corpo bruto de um invoke.
pub fn amostras_da_requisicao(
    requisicao: &tauri::ipc::Request<'_>,
) -> Result<Vec<f32>, String> {
    let tauri::ipc::InvokeBody::Raw(dados) = requisicao.body() else {
        return Err("Esperava as amostras de áudio no corpo da chamada".into());
    };
    amostras_do_corpo(dados)
}

/// Preenche com silêncio até a duração mínima que o whisper.cpp aceita
/// (ele rejeita áudio com menos de ~1 s).
pub fn com_duracao_minima(mut amostras: Vec<f32>) -> Vec<f32> {
    if amostras.len() < DURACAO_MINIMA_AMOSTRAS {
        amostras.resize(DURACAO_MINIMA_AMOSTRAS, 0.0);
    }
    amostras
}

/// Estado gerenciado pelo Tauri: o modelo Whisper carregado. Carregar custa
/// segundos e centenas de MB, então o contexto do último caminho que carregou
/// vale pela execução inteira do app — no caso normal, um único carregamento,
/// no primeiro trecho. Se o desenvolvedor trocar o arquivo em `modelos/` da
/// pasta de dados, o caminho muda e o contexto é recarregado.
#[derive(Default)]
pub struct Transcritor {
    carregado: Mutex<Option<ModeloCarregado>>,
    /// Caminhos que não carregaram nesta execução. O whisper.cpp não libera
    /// o que alocou numa carga que falha, e `transcrever_audio` (lib.rs) pede
    /// os candidatos em ordem a cada trecho: sem isto, um modelo truncado na
    /// pasta de dados seria reaberto — e vazaria memória — a cada 12–28 s
    /// antes de a reserva embutida responder. Trocar o arquivo avariado só
    /// vale depois de reabrir o app.
    rejeitados: Mutex<HashSet<PathBuf>>,
}

struct ModeloCarregado {
    caminho: PathBuf,
    contexto: Arc<WhisperContext>,
}

impl Transcritor {
    /// Devolve o contexto do modelo em `caminho`, carregando-o se preciso.
    pub fn contexto(&self, caminho: &Path) -> Result<Arc<WhisperContext>, String> {
        let mut carregado = self
            .carregado
            .lock()
            .map_err(|_| "Transcritor indisponível".to_string())?;
        if let Some(modelo) = carregado.as_ref() {
            if modelo.caminho == caminho {
                return Ok(Arc::clone(&modelo.contexto));
            }
        }
        let mut rejeitados = self
            .rejeitados
            .lock()
            .map_err(|_| "Transcritor indisponível".to_string())?;
        if rejeitados.contains(caminho) {
            return Err(format!(
                "Modelo de transcrição rejeitado nesta execução: {}",
                caminho.display()
            ));
        }
        let mut parametros = WhisperContextParameters::default();
        parametros.use_gpu(USAR_GPU);
        let contexto = match WhisperContext::new_with_params(caminho, parametros) {
            Ok(contexto) => Arc::new(contexto),
            Err(erro) => {
                rejeitados.insert(caminho.to_path_buf());
                let mensagem = format!(
                    "Não foi possível carregar o modelo de transcrição {}: {erro}",
                    caminho.display()
                );
                eprintln!("{mensagem}");
                return Err(mensagem);
            }
        };
        // O nome do arquivo é o mesmo na pasta de dados e no bundle; só o
        // caminho completo diz qual dos dois entrou em uso.
        eprintln!("Modelo de transcrição carregado: {}", caminho.display());
        *carregado = Some(ModeloCarregado {
            caminho: caminho.to_path_buf(),
            contexto: Arc::clone(&contexto),
        });
        Ok(contexto)
    }
}

/// Como decodificar: gulosa (a de hoje) ou busca em feixe, o padrão da
/// implementação de referência da OpenAI e o usado nos números publicados.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Estrategia {
    Gulosa,
    Feixe(i32),
}

/// O que varia numa transcrição além do áudio. A medição da #34
/// (`examples/medir.rs`) compara as combinações; o app usa [`Opcoes::do_app`].
#[derive(Clone, Debug)]
pub struct Opcoes {
    pub estrategia: Estrategia,
    /// Prompt fixo do Trecho. Só na medição (`examples/medir.rs`): com nome
    /// e frase de estilo, a #34 mediu piora em todas as condições — o texto
    /// do prompt vaza para a transcrição. E nunca o texto já transcrito: a
    /// #14 mostrou que isso carrega erros adiante.
    pub prompt: Option<String>,
    /// Caminho do modelo Silero para o VAD interno do whisper.cpp, que
    /// filtra o não-fala dentro do trecho antes do encoder.
    pub vad_interno: Option<PathBuf>,
    /// Threads do whisper.cpp (nulo = o padrão dele, 4).
    pub threads: Option<i32>,
    /// Ganho automático no trecho antes do modelo: o log-mel do whisper.cpp
    /// não é invariante ao nível (a constante `(x + 4) / 4` é absoluta), e
    /// voz a −50 dBFS cai numa faixa de valores que o modelo pouco viu.
    pub ganho: bool,
}

/// Pico a que um trecho quieto é levado antes do modelo (−6 dBFS); nunca
/// atenua, e o ganho é limitado a 30 dB para não amplificar silêncio.
const PICO_ALVO: f32 = 0.5;
const GANHO_MAXIMO: f32 = 31.6;

/// Leva o áudio ao pico alvo quando está abaixo dele.
pub fn com_ganho(mut amostras: Vec<f32>) -> Vec<f32> {
    let pico = amostras.iter().fold(0.0f32, |maior, a| maior.max(a.abs()));
    if pico > 0.0 && pico < PICO_ALVO {
        let ganho = (PICO_ALVO / pico).min(GANHO_MAXIMO);
        for amostra in &mut amostras {
            *amostra *= ganho;
        }
    }
    amostras
}

impl Opcoes {
    /// A configuração do app, escolhida pela medição da #34
    /// (docs/pesquisa/2026-09-transcricao-a-distancia.md): decodificação
    /// gulosa (a busca em feixe saiu pior e mais lenta), sem prompt (piorou
    /// em todas as condições), sem ganho automático antes do modelo (piorou
    /// na voz baixa a distância) e sem o VAD interno do whisper.cpp (não
    /// medido).
    pub fn do_app() -> Self {
        Self {
            estrategia: Estrategia::Gulosa,
            prompt: None,
            vad_interno: None,
            threads: None,
            ganho: false,
        }
    }

}

/// O prompt que a medição da #34 testou (e rejeitou): um nome de Paciente
/// para a grafia e uma frase curta em estilo de transcrição para o estilo,
/// como o guia de prompting da OpenAI sugere.
pub fn prompt_medido(paciente: &str) -> String {
    format!("Consulta de psicoterapia com {paciente}. Conversa sobre a semana, a família, o trabalho e como tem se sentido.")
}

/// Transcreve um trecho de áudio (16 kHz mono) em pt-BR e devolve o texto.
pub fn transcrever(
    contexto: &WhisperContext,
    amostras: &[f32],
    opcoes: &Opcoes,
) -> Result<String, String> {
    let estrategia = match opcoes.estrategia {
        Estrategia::Gulosa => SamplingStrategy::Greedy { best_of: 1 },
        Estrategia::Feixe(beam_size) => SamplingStrategy::BeamSearch {
            beam_size,
            patience: -1.0,
        },
    };
    let mut params = FullParams::new(estrategia);
    params.set_language(Some("pt"));
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    // Sem tokens de não-fala ("[MÚSICA]" etc.) no Conteúdo da Consulta.
    params.set_suppress_nst(true);
    if let Some(threads) = opcoes.threads {
        params.set_n_threads(threads);
    }
    if let Some(prompt) = opcoes.prompt.as_deref() {
        params.set_initial_prompt(prompt);
    }
    let caminho_vad = opcoes
        .vad_interno
        .as_ref()
        .map(|caminho| caminho.to_string_lossy().into_owned());
    if let Some(caminho) = caminho_vad.as_deref() {
        params.set_vad_model_path(Some(caminho));
        params.enable_vad(true);
    }

    let ajustadas;
    let amostras = if opcoes.ganho {
        ajustadas = com_ganho(amostras.to_vec());
        ajustadas.as_slice()
    } else {
        amostras
    };
    let mut estado = contexto
        .create_state()
        .map_err(|erro| format!("Não foi possível preparar a transcrição: {erro}"))?;
    estado
        .full(params, amostras)
        .map_err(|erro| format!("A transcrição falhou: {erro}"))?;

    // Os segmentos são juntados como bytes antes da validação UTF-8: um
    // caractere multibyte pode ser partido na fronteira entre segmentos, e
    // validar cada pedaço isolado o transformaria em "�".
    let mut bytes = Vec::new();
    for segmento in estado.as_iter() {
        match segmento.to_bytes() {
            Ok(parte) => bytes.extend_from_slice(parte),
            Err(erro) => return Err(format!("A transcrição falhou: {erro}")),
        }
    }
    Ok(String::from_utf8_lossy(&bytes).trim().to_string())
}

#[cfg(test)]
mod testes {
    use std::fs;

    use super::*;

    fn diretorio_de_teste() -> tempfile::TempDir {
        tempfile::tempdir().expect("criar diretório temporário")
    }

    fn criar_modelo(diretorio: &Path, nome: &str) {
        fs::write(diretorio.join(nome), b"ggml").expect("criar arquivo de modelo");
    }

    #[test]
    fn sem_modelo_no_diretorio_nao_ha_o_que_localizar() {
        let pasta = diretorio_de_teste();

        assert_eq!(localizar_modelo(pasta.path()), None);
        // O diretório pode nem existir ainda (primeira execução do app).
        assert_eq!(localizar_modelo(&pasta.path().join("modelos")), None);
    }

    #[test]
    fn localiza_o_unico_modelo_presente() {
        let pasta = diretorio_de_teste();
        criar_modelo(pasta.path(), "ggml-tiny.bin");

        assert_eq!(
            localizar_modelo(pasta.path()),
            Some(pasta.path().join("ggml-tiny.bin"))
        );
    }

    #[test]
    fn entre_varios_modelos_prevalece_o_de_melhor_qualidade() {
        let pasta = diretorio_de_teste();
        criar_modelo(pasta.path(), "ggml-tiny.bin");
        criar_modelo(pasta.path(), "ggml-small.bin");
        criar_modelo(pasta.path(), "ggml-base.bin");

        assert_eq!(
            localizar_modelo(pasta.path()),
            Some(pasta.path().join("ggml-small.bin"))
        );
    }

    #[test]
    fn arquivos_estranhos_no_diretorio_de_modelos_sao_ignorados() {
        let pasta = diretorio_de_teste();
        criar_modelo(pasta.path(), "leia-me.txt");
        criar_modelo(pasta.path(), "ggml-large.bin");

        assert_eq!(localizar_modelo(pasta.path()), None);
    }

    #[test]
    fn entre_diretorios_vale_a_ordem_e_nao_a_qualidade() {
        let dados = diretorio_de_teste();
        let embutido = diretorio_de_teste();
        criar_modelo(dados.path(), "ggml-base.bin");
        criar_modelo(embutido.path(), "ggml-small.bin");

        assert_eq!(
            localizar_modelo_entre(&[dados.path().to_path_buf(), embutido.path().to_path_buf()]),
            Some(dados.path().join("ggml-base.bin"))
        );
    }

    #[test]
    fn sem_modelo_na_pasta_de_dados_vale_o_embutido() {
        let dados = diretorio_de_teste();
        let embutido = diretorio_de_teste();
        criar_modelo(embutido.path(), "ggml-small.bin");

        assert_eq!(
            // A pasta de dados pode nem ter `modelos/` — o caso normal.
            localizar_modelo_entre(&[dados.path().join("modelos"), embutido.path().to_path_buf()]),
            Some(embutido.path().join("ggml-small.bin"))
        );
    }

    #[test]
    fn sem_modelo_em_lugar_nenhum_nao_ha_o_que_localizar() {
        let dados = diretorio_de_teste();
        let embutido = diretorio_de_teste();

        assert_eq!(
            localizar_modelo_entre(&[dados.path().to_path_buf(), embutido.path().to_path_buf()]),
            None
        );
        assert_eq!(localizar_modelo_entre(&[]), None);
    }

    #[test]
    fn os_candidatos_trazem_um_modelo_por_diretorio_na_ordem_de_precedencia() {
        let dados = diretorio_de_teste();
        let embutido = diretorio_de_teste();
        criar_modelo(dados.path(), "ggml-tiny.bin");
        criar_modelo(dados.path(), "ggml-base.bin");
        criar_modelo(embutido.path(), "ggml-small.bin");

        assert_eq!(
            candidatos_a_modelo(&[dados.path().to_path_buf(), embutido.path().to_path_buf()]),
            vec![
                dados.path().join("ggml-base.bin"),
                embutido.path().join("ggml-small.bin")
            ]
        );
    }

    /// Um arquivo que não é um modelo ggml falha na carga (o whisper.cpp
    /// rejeita o cabeçalho) e, daí em diante, é recusado sem ser reaberto.
    #[test]
    fn um_modelo_que_nao_carrega_e_rejeitado_ate_o_fim_da_execucao() {
        let pasta = diretorio_de_teste();
        criar_modelo(pasta.path(), "ggml-small.bin");
        let caminho = pasta.path().join("ggml-small.bin");
        let transcritor = Transcritor::default();

        let primeira = transcritor.contexto(&caminho).unwrap_err();
        assert!(primeira.starts_with("Não foi possível carregar"), "{primeira}");

        let segunda = transcritor.contexto(&caminho).unwrap_err();
        assert!(segunda.starts_with("Modelo de transcrição rejeitado"), "{segunda}");
    }

    /// Regressão: a GPU só entra onde o Metal é confiável. Num Mac Intel a
    /// transcrição sai ilegível — e sem erro algum, então nenhuma outra
    /// verificação pega isso. Se um dia o backend passar a valer para mais
    /// hardware, que seja com este teste na mão e áudio real conferido.
    #[test]
    fn a_gpu_so_e_usada_no_apple_silicon() {
        if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
            assert!(USAR_GPU, "no Apple Silicon o Metal acelera e é confiável");
        } else {
            assert!(
                !USAR_GPU,
                "fora do Apple Silicon a inferência tem de ficar na CPU"
            );
        }
    }

    #[test]
    fn amostras_do_corpo_decodifica_f32_little_endian() {
        let bytes: Vec<u8> = [0.5f32, -1.0]
            .iter()
            .flat_map(|amostra| amostra.to_le_bytes())
            .collect();

        assert_eq!(amostras_do_corpo(&bytes), Ok(vec![0.5, -1.0]));
    }

    #[test]
    fn corpo_com_tamanho_desalinhado_e_rejeitado() {
        assert!(amostras_do_corpo(&[0, 0, 0, 0, 0, 0]).is_err());
    }

    #[test]
    fn o_ganho_leva_o_trecho_quieto_ao_pico_alvo_e_nao_mexe_no_trecho_alto() {
        let quieto = com_ganho(vec![0.01, -0.02, 0.005]);
        assert!((quieto[1] + 0.5).abs() < 1e-6, "{quieto:?}");
        assert!((quieto[0] - 0.25).abs() < 1e-6);

        // Já no pico alvo ou acima: sai como entrou.
        assert_eq!(com_ganho(vec![0.5, -0.9]), vec![0.5, -0.9]);
        // Silêncio quase digital: no máximo 30 dB, nunca vira ruído alto.
        let silencio = com_ganho(vec![0.0001; 4]);
        assert!(silencio[0] < 0.004, "{silencio:?}");
        assert_eq!(com_ganho(vec![0.0; 3]), vec![0.0; 3]);
    }

    #[test]
    fn audio_curto_e_preenchido_com_silencio_ate_a_duracao_minima() {
        let preenchido = com_duracao_minima(vec![0.25; 100]);

        // 1,1 s × 16 kHz — folga sobre o mínimo de ~1 s do whisper.cpp.
        assert_eq!(preenchido.len(), 17600);
        assert_eq!(&preenchido[..100], &[0.25; 100][..]);
        assert!(preenchido[100..].iter().all(|amostra| *amostra == 0.0));
    }

    #[test]
    fn audio_com_mais_de_um_segundo_passa_intacto() {
        let amostras = vec![0.25; 2 * TAXA_AMOSTRAGEM];

        assert_eq!(com_duracao_minima(amostras.clone()), amostras);
    }
}
