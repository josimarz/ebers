//! Transcrição de voz offline da Consulta (spec 2.3 e 5.3; ADR-0004; issue #10).
//!
//! O frontend capta o áudio, junta em trechos e manda os bytes crus para cá;
//! o whisper.cpp (via whisper-rs) transcreve 100% local, em pt-BR. O modelo
//! ggml vive no diretório `modelos/`, ao lado do `ebers.db` — baixado uma vez
//! pela terapeuta (docs/operacao.md), nunca embutido no instalador.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters,
};

/// Subdiretório dos modelos Whisper dentro do diretório de dados do app.
pub const DIRETORIO_MODELOS: &str = "modelos";

/// Modelos aceitos, do melhor para o mais leve — a terapeuta baixa o que o
/// hardware dela comporta (docs/operacao.md); havendo mais de um, prevalece a
/// qualidade.
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
/// segundos e centenas de MB, então acontece uma vez — no primeiro trecho — e
/// o contexto vale pela execução inteira do app. Se a terapeuta trocar o
/// arquivo de modelo, o caminho muda e o contexto é recarregado.
#[derive(Default)]
pub struct Transcritor {
    carregado: Mutex<Option<ModeloCarregado>>,
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
        let mut parametros = WhisperContextParameters::default();
        parametros.use_gpu(USAR_GPU);
        let contexto = Arc::new(
            WhisperContext::new_with_params(caminho, parametros).map_err(|erro| {
                format!("Não foi possível carregar o modelo de transcrição: {erro}")
            })?,
        );
        *carregado = Some(ModeloCarregado {
            caminho: caminho.to_path_buf(),
            contexto: Arc::clone(&contexto),
        });
        Ok(contexto)
    }
}

/// Transcreve um trecho de áudio (16 kHz mono) em pt-BR e devolve o texto.
pub fn transcrever(contexto: &WhisperContext, amostras: &[f32]) -> Result<String, String> {
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("pt"));
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    // Sem tokens de não-fala ("[MÚSICA]" etc.) no Conteúdo da Consulta.
    params.set_suppress_nst(true);

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
