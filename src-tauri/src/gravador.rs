//! Gravação da Consulta: junta os blocos captados do microfone em Trechos
//! prontos para o Whisper (spec 5.3; issue #34).
//!
//! Portado de `src/dominio/transcricao.ts`, com uma diferença de princípio:
//! fala e silêncio deixaram de ser decididos pelo volume. No consultório o
//! Paciente fala a uns 2 m do MacBook, e voz baixa a essa distância vivia
//! perto do limiar de −40 dBFS — o Trecho fechava no meio da frase e uma
//! Janela inteira sem bloco acima do limiar era descartada sem transcrever.
//! Agora quem decide é um detector de voz (o Silero VAD embutido no
//! whisper.cpp), que ouve conteúdo, não amplitude. A regra antiga continua
//! aqui, como [`PorVolume`], só para a medição (`examples/medir.rs`)
//! comparar as duas.
//!
//! O [`Gravador`] é o estado que o Tauri gerencia: a gravação em andamento e
//! os Trechos fechados à espera do Whisper. Gravação e Trecho têm ids, e o
//! frontend os leva em toda chamada: desligar e religar depressa, ou trocar
//! de Consulta, nunca mistura o áudio de uma gravação com o de outra, e o
//! que restou de uma gravação encerrada continua recuperável.

use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use whisper_rs::{WhisperVadContext, WhisperVadContextParams};

use crate::transcricao::{com_ganho, TAXA_AMOSTRAGEM};

/// O detector de voz embutido no app, ao lado do modelo Whisper (Silero VAD
/// v6.2.0 em ggml, baixado por `scripts/baixar-modelo.sh`).
pub const ARQUIVO_VAD: &str = "ggml-silero-v6.2.0.bin";

/// Fala acumulada mínima antes de uma pausa poder fechar o Trecho.
///
/// Trecho curto custa precisão: o Whisper decodifica cada um sozinho, sem
/// nada do que veio antes, e toda costura é uma chance de errar a emenda.
/// Medido na #14 sobre 100 s de ditado real (210 palavras): com 2 s eram 29
/// trechos e 33 erros; com 12 s, 8 trechos e 22 erros — o mesmo resultado de
/// transcrever a gravação inteira de uma vez. Tem de ficar **abaixo** de
/// [`TRECHO_MAXIMO_S`] com folga: se alcançá-lo, a pausa nunca fecha trecho
/// nenhum e todo corte cai no teto, no meio da palavra (59 erros na mesma
/// gravação).
pub const TRECHO_MINIMO_S: f32 = 12.0;
/// Pausa de fala que fecha o Trecho — a deixa natural de quem fala.
pub const PAUSA_PARA_FECHAR_S: f32 = 0.6;
/// Fala contínua nunca segura um Trecho além disto.
pub const TRECHO_MAXIMO_S: f32 = 28.0;

/// Decide se um bloco captado tem fala.
pub trait DetectorDeFala {
    fn ha_fala(&mut self, bloco: &[f32]) -> bool;
    /// Começa uma gravação nova: nada do áudio anterior conta.
    fn reiniciar(&mut self) {}
}

/// A regra antiga: RMS abaixo de ~−40 dBFS é silêncio. Só para a medição.
pub struct PorVolume {
    limiar_rms: f32,
}

impl PorVolume {
    /// O limiar que o app usava até a #34 (0,01 ≈ −40 dBFS).
    pub const LIMIAR_ANTIGO: f32 = 0.01;

    pub fn new(limiar_rms: f32) -> Self {
        Self { limiar_rms }
    }
}

impl DetectorDeFala for PorVolume {
    fn ha_fala(&mut self, bloco: &[f32]) -> bool {
        if bloco.is_empty() {
            return false;
        }
        let soma: f32 = bloco.iter().map(|amostra| amostra * amostra).sum();
        (soma / bloco.len() as f32).sqrt() >= self.limiar_rms
    }
}

/// Quanto de áudio anterior acompanha cada lote na chamada ao VAD.
///
/// O `whisper_vad_detect_speech` zera o estado da LSTM do Silero a cada
/// chamada, então um lote avaliado sozinho seria julgado sem contexto. Cada
/// lote vai com o meio segundo anterior, e só as janelas do VAD que cobrem
/// o lote contam na decisão.
const HISTORICO_S: f32 = 0.5;
/// Áudio novo acumulado antes de chamar o VAD. Avaliar bloco a bloco (85 ms)
/// custava 34 janelas do Silero por bloco, 13 vezes o mesmo áudio; em lotes
/// de um quarto de segundo, os blocos entre duas avaliações levam a decisão
/// da última — atraso menor que a pausa de 0,6 s que fecha um Trecho.
const LOTE_S: f32 = 0.25;

/// O detector do app: Silero VAD, via whisper.cpp, em fluxo.
pub struct PorVad {
    contexto: WhisperVadContext,
    /// Os últimos [`HISTORICO_S`] já avaliados.
    historico: Vec<f32>,
    /// Blocos ainda não avaliados (menos de um lote).
    pendente: Vec<f32>,
    limiar: f32,
    /// Ganho automático antes do detector ([`com_ganho`]): a voz baixa a 2 m
    /// chega a −50 dBFS e o Silero, treinado em fala a níveis normais, não
    /// a reconhece; com o ganho, reconhece.
    normalizar: bool,
    ultima_decisao: bool,
}

impl PorVad {
    /// Probabilidade a partir da qual uma janela do VAD conta como fala (o
    /// padrão do Silero), e o ganho automático ligado — medidos na #34
    /// (docs/pesquisa/2026-09-transcricao-a-distancia.md): sem o ganho, 25
    /// Janelas de voz baixa a 2 m foram descartadas inteiras; com ele,
    /// nenhuma, em condição alguma.
    pub const LIMIAR_DO_APP: f32 = 0.5;
    pub const NORMALIZAR_NO_APP: bool = true;

    pub fn new(caminho_do_modelo: &str, limiar: f32, normalizar: bool) -> Result<Self, String> {
        let mut parametros = WhisperVadContextParams::new();
        // Modelo minúsculo (menos de 1 MB): CPU, sempre.
        parametros.set_use_gpu(false);
        parametros.set_n_threads(1);
        let contexto = WhisperVadContext::new(caminho_do_modelo, parametros).map_err(|erro| {
            format!("Não foi possível carregar o detector de voz {caminho_do_modelo}: {erro:?}")
        })?;
        Ok(Self {
            contexto,
            historico: Vec::new(),
            pendente: Vec::new(),
            limiar,
            normalizar,
            ultima_decisao: false,
        })
    }

    /// Avalia histórico + pendente e devolve se o pendente tem fala.
    fn avaliar(&mut self) -> bool {
        let mut amostras = Vec::with_capacity(self.historico.len() + self.pendente.len());
        amostras.extend_from_slice(&self.historico);
        amostras.extend_from_slice(&self.pendente);
        if self.normalizar {
            amostras = com_ganho(amostras);
        }
        let decisao = if self.contexto.detect_speech(&amostras).is_err() {
            // Na dúvida, fala: nunca descartar voz por falha do detector.
            true
        } else {
            let probabilidades = self.contexto.probabilities();
            if probabilidades.is_empty() {
                true
            } else {
                // Janelas do VAD (512 amostras no Silero) alinhadas ao início
                // do áudio; as que cobrem o pendente são as últimas, mais a
                // que pode estar a cavalo da fronteira.
                let janela = amostras.len().div_ceil(probabilidades.len()).max(1);
                let do_lote = (self.pendente.len().div_ceil(janela) + 1).min(probabilidades.len());
                probabilidades[probabilidades.len() - do_lote..]
                    .iter()
                    .any(|probabilidade| *probabilidade >= self.limiar)
            }
        };
        // O histórico anda: os últimos HISTORICO_S do áudio original.
        let maximo = (HISTORICO_S * TAXA_AMOSTRAGEM as f32) as usize;
        self.historico.extend_from_slice(&self.pendente);
        if self.historico.len() > maximo {
            let excesso = self.historico.len() - maximo;
            self.historico.drain(..excesso);
        }
        self.pendente.clear();
        decisao
    }
}

impl DetectorDeFala for PorVad {
    fn ha_fala(&mut self, bloco: &[f32]) -> bool {
        if bloco.is_empty() {
            return false;
        }
        self.pendente.extend_from_slice(bloco);
        if (self.pendente.len() as f32) < LOTE_S * TAXA_AMOSTRAGEM as f32 {
            return self.ultima_decisao;
        }
        self.ultima_decisao = self.avaliar();
        self.ultima_decisao
    }

    fn reiniciar(&mut self) {
        self.historico.clear();
        self.pendente.clear();
        self.ultima_decisao = false;
    }
}

/// Fim de uma Janela do acumulador: o Trecho a transcrever, ou nada quando
/// ninguém falou nela. A Janela vazia ainda é sinalizada porque a Prévia
/// (ADR-0007) recomeça o reconhecedor a cada Janela — um request nunca vive
/// além de um Trecho, com fala ou sem.
#[derive(Debug, PartialEq)]
pub struct JanelaFechada {
    pub trecho: Option<Vec<f32>>,
}

/// Junta os blocos (16 kHz mono) em Trechos prontos para transcrever. Quem
/// diz se cada bloco tem fala é o [`DetectorDeFala`] do chamador; o
/// acumulador nunca olha a amplitude.
#[derive(Default)]
pub struct Acumulador {
    amostras: Vec<f32>,
    silencio_final: usize,
    houve_fala: bool,
}

impl Acumulador {
    /// Recebe um bloco captado; devolve a Janela fechada, se este bloco a fechou.
    pub fn registrar(&mut self, bloco: &[f32], fala: bool) -> Option<JanelaFechada> {
        self.amostras.extend_from_slice(bloco);
        if fala {
            self.silencio_final = 0;
            self.houve_fala = true;
        } else {
            self.silencio_final += bloco.len();
        }
        let taxa = TAXA_AMOSTRAGEM as f32;
        let pausa_fechou = self.amostras.len() as f32 >= TRECHO_MINIMO_S * taxa
            && self.silencio_final as f32 >= PAUSA_PARA_FECHAR_S * taxa;
        let estourou_maximo = self.amostras.len() as f32 >= TRECHO_MAXIMO_S * taxa;
        (pausa_fechou || estourou_maximo).then(|| self.cortar())
    }

    /// O que restou ao desligar o microfone (nada se ninguém falou).
    pub fn descarregar(&mut self) -> Option<Vec<f32>> {
        self.cortar().trecho
    }

    fn cortar(&mut self) -> JanelaFechada {
        let amostras = std::mem::take(&mut self.amostras);
        let com_fala = self.houve_fala;
        self.silencio_final = 0;
        self.houve_fala = false;
        JanelaFechada {
            trecho: com_fala.then_some(amostras),
        }
    }
}

/// Ids de gravação e de Trecho: crescentes, a partir de 1, por execução do app.
pub type IdGravacao = u64;
pub type IdTrecho = u64;

/// O que `audio_bloco` (lib.rs) devolve ao frontend: se o bloco fechou a
/// Janela e, nesse caso, o id do Trecho que foi para a fila — nenhum quando
/// a Janela não tinha fala (a Prévia só recomeça a Janela).
#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Corte {
    pub fechou: bool,
    pub trecho: Option<IdTrecho>,
}

impl Corte {
    pub const JANELA_ABERTA: Self = Self {
        fechou: false,
        trecho: None,
    };
}

/// Um Trecho à espera do Whisper.
pub struct TrechoPendente {
    pub amostras: Vec<f32>,
}

/// Trechos pendentes acima disto (mais de um quarto de hora de fala que
/// ninguém pediu para transcrever) são sinal de frontend que sumiu: os mais
/// antigos vão embora em vez de acumular memória.
const MAXIMO_DE_TRECHOS_PENDENTES: usize = 32;

struct EmAndamento {
    id: IdGravacao,
    detector: PorVad,
    acumulador: Acumulador,
}

/// Estado gerenciado pelo Tauri: a gravação em andamento (detector de voz e
/// acumulador) e os Trechos fechados à espera da transcrição.
#[derive(Default)]
pub struct Gravador {
    em_andamento: Mutex<Option<EmAndamento>>,
    trechos: Mutex<HashMap<IdTrecho, TrechoPendente>>,
    /// Gravações que uma gravação nova encerrou antes de o frontend as
    /// descarregar: o Trecho que restou de cada uma, se houve fala.
    encerradas: Mutex<HashMap<IdGravacao, Option<IdTrecho>>>,
    ultima_gravacao: AtomicU64,
    ultimo_trecho: AtomicU64,
}

fn indisponivel<T>(_: T) -> String {
    "Gravador indisponível".to_string()
}

impl Gravador {
    /// Começa uma gravação: carrega o detector de voz. Uma gravação anterior
    /// ainda aberta é encerrada aqui — o que restou dela continua recuperável
    /// por [`Self::descarregar`] com o id dela.
    pub fn iniciar(&self, caminho_vad: &Path) -> Result<IdGravacao, String> {
        let detector = PorVad::new(
            &caminho_vad.to_string_lossy(),
            PorVad::LIMIAR_DO_APP,
            PorVad::NORMALIZAR_NO_APP,
        )?;
        let mut guarda = self.em_andamento.lock().map_err(indisponivel)?;
        if let Some(anterior) = guarda.take() {
            self.encerrar(anterior)?;
        }
        let id = self.ultima_gravacao.fetch_add(1, Ordering::SeqCst) + 1;
        *guarda = Some(EmAndamento {
            id,
            detector,
            acumulador: Acumulador::default(),
        });
        Ok(id)
    }

    /// Recebe um bloco captado (16 kHz mono) da gravação `gravacao`. Blocos
    /// de outra gravação (ainda chegam depois de desligar) são ignorados.
    pub fn registrar(&self, gravacao: IdGravacao, bloco: &[f32]) -> Result<Corte, String> {
        let mut guarda = self.em_andamento.lock().map_err(indisponivel)?;
        let Some(atual) = guarda.as_mut().filter(|g| g.id == gravacao) else {
            return Ok(Corte::JANELA_ABERTA);
        };
        let fala = atual.detector.ha_fala(bloco);
        let Some(janela) = atual.acumulador.registrar(bloco, fala) else {
            return Ok(Corte::JANELA_ABERTA);
        };
        let trecho = match janela.trecho {
            Some(amostras) => Some(self.enfileirar(amostras)?),
            None => None,
        };
        Ok(Corte {
            fechou: true,
            trecho,
        })
    }

    /// Encerra a gravação `gravacao`; devolve o id do Trecho que restou, se
    /// houve fala nele. Para uma gravação já encerrada por outra, devolve o
    /// que ficou guardado — uma vez só.
    pub fn descarregar(&self, gravacao: IdGravacao) -> Result<Option<IdTrecho>, String> {
        let mut guarda = self.em_andamento.lock().map_err(indisponivel)?;
        if guarda.as_ref().is_some_and(|g| g.id == gravacao) {
            let mut atual = guarda.take().expect("gravação em andamento");
            return match atual.acumulador.descarregar() {
                Some(amostras) => Ok(Some(self.enfileirar(amostras)?)),
                None => Ok(None),
            };
        }
        drop(guarda);
        Ok(self
            .encerradas
            .lock()
            .map_err(indisponivel)?
            .remove(&gravacao)
            .flatten())
    }

    /// Tira da fila o Trecho `trecho`; nada se o id é desconhecido (já
    /// transcrito, ou descartado por excesso).
    pub fn retirar_trecho(&self, trecho: IdTrecho) -> Result<Option<TrechoPendente>, String> {
        Ok(self.trechos.lock().map_err(indisponivel)?.remove(&trecho))
    }

    fn encerrar(&self, mut gravacao: EmAndamento) -> Result<(), String> {
        let trecho = match gravacao.acumulador.descarregar() {
            Some(amostras) => Some(self.enfileirar(amostras)?),
            None => None,
        };
        self.encerradas
            .lock()
            .map_err(indisponivel)?
            .insert(gravacao.id, trecho);
        Ok(())
    }

    fn enfileirar(&self, amostras: Vec<f32>) -> Result<IdTrecho, String> {
        let id = self.ultimo_trecho.fetch_add(1, Ordering::SeqCst) + 1;
        let mut trechos = self.trechos.lock().map_err(indisponivel)?;
        trechos.insert(id, TrechoPendente { amostras });
        while trechos.len() > MAXIMO_DE_TRECHOS_PENDENTES {
            let mais_antigo = *trechos.keys().min().expect("fila não vazia");
            trechos.remove(&mais_antigo);
        }
        Ok(id)
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    fn bloco(duracao_s: f32, amplitude: f32) -> Vec<f32> {
        vec![amplitude; (duracao_s * TAXA_AMOSTRAGEM as f32) as usize]
    }

    /// Alimenta o acumulador com blocos de 0,5 s (`true` = com fala) e
    /// devolve os trechos emitidos.
    fn alimentar(acumulador: &mut Acumulador, falas: &[bool]) -> Vec<Vec<f32>> {
        falas
            .iter()
            .filter_map(|fala| {
                acumulador
                    .registrar(&bloco(0.5, if *fala { 0.25 } else { 0.0 }), *fala)
                    .and_then(|janela| janela.trecho)
            })
            .collect()
    }

    #[test]
    fn a_pausa_depois_da_fala_fecha_o_trecho_com_a_fala_preservada() {
        let mut acumulador = Acumulador::default();

        // 12 s de fala: nada emitido ainda.
        assert!(alimentar(&mut acumulador, &[true; 24]).is_empty());
        // 0,5 s de pausa ainda não fecha o trecho…
        assert_eq!(acumulador.registrar(&bloco(0.5, 0.0), false), None);
        // …1 s de pausa fecha: 13 s de áudio, fala na frente, pausa no fim.
        let trecho = acumulador
            .registrar(&bloco(0.5, 0.0), false)
            .and_then(|janela| janela.trecho)
            .expect("trecho fechado pela pausa");
        assert_eq!(trecho.len(), 13 * TAXA_AMOSTRAGEM);
        assert_eq!(trecho[0], 0.25);
        assert_eq!(trecho[13 * TAXA_AMOSTRAGEM - 1], 0.0);

        // A janela recomeça vazia: silêncio novo não emite nada.
        assert_eq!(acumulador.registrar(&bloco(0.5, 0.0), false), None);
    }

    /// O que muda com o VAD: o acumulador só olha a decisão do detector.
    /// Amplitude quase nula com `fala = true` é fala; a regra antiga teria
    /// descartado a janela inteira.
    #[test]
    fn o_acumulador_confia_no_detector_e_nao_na_amplitude() {
        let mut acumulador = Acumulador::default();

        for _ in 0..24 {
            assert_eq!(acumulador.registrar(&bloco(0.5, 0.001), true), None);
        }
        acumulador.registrar(&bloco(0.5, 0.0), false);
        let trecho = acumulador
            .registrar(&bloco(0.5, 0.0), false)
            .and_then(|janela| janela.trecho)
            .expect("a fala baixa vira trecho");
        assert_eq!(trecho.len(), 13 * TAXA_AMOSTRAGEM);

        // E o contrário: amplitude alta com `fala = false` é ruído, não fala —
        // aos 12 s a janela fecha vazia.
        for _ in 0..23 {
            assert_eq!(acumulador.registrar(&bloco(0.5, 0.9), false), None);
        }
        assert_eq!(
            acumulador.registrar(&bloco(0.5, 0.9), false),
            Some(JanelaFechada { trecho: None })
        );
    }

    #[test]
    fn fala_continua_sem_pausa_e_cortada_na_duracao_maxima() {
        let mut acumulador = Acumulador::default();

        // 27,5 s de fala ininterrupta: nada emitido…
        assert!(alimentar(&mut acumulador, &[true; 55]).is_empty());
        // …no bloco que completa 28 s, o trecho sai inteiro.
        let trecho = acumulador
            .registrar(&bloco(0.5, 0.25), true)
            .and_then(|janela| janela.trecho)
            .expect("trecho cortado no teto");
        assert_eq!(trecho.len(), 28 * TAXA_AMOSTRAGEM);
    }

    #[test]
    fn silencio_por_mais_longo_que_seja_nunca_vira_trecho() {
        let mut acumulador = Acumulador::default();

        // 30 s de silêncio: passa pelos pontos de decisão da pausa e do máximo.
        assert!(alimentar(&mut acumulador, &[false; 60]).is_empty());
        assert_eq!(acumulador.descarregar(), None);
    }

    #[test]
    fn silencio_longo_fecha_janelas_vazias_sem_trecho_mas_sinalizadas() {
        let mut acumulador = Acumulador::default();

        // 11,5 s de silêncio: a janela segue aberta…
        for _ in 0..23 {
            assert_eq!(acumulador.registrar(&bloco(0.5, 0.0), false), None);
        }
        // …aos 12 s ela fecha vazia: a Prévia precisa recomeçar a janela
        // mesmo sem nada para o Whisper transcrever.
        assert_eq!(
            acumulador.registrar(&bloco(0.5, 0.0), false),
            Some(JanelaFechada { trecho: None })
        );
    }

    #[test]
    fn desligar_o_microfone_descarrega_a_fala_que_ainda_nao_fechou_trecho() {
        let mut acumulador = Acumulador::default();

        // 1 s de fala: abaixo do mínimo, nada emitido.
        assert!(alimentar(&mut acumulador, &[true, true]).is_empty());

        let resto = acumulador.descarregar().expect("fala pendente");
        assert_eq!(resto.len(), TAXA_AMOSTRAGEM);
        assert_eq!(resto[0], 0.25);

        // Depois de descarregar, não há mais nada pendente.
        assert_eq!(acumulador.descarregar(), None);
    }

    #[test]
    fn por_volume_reproduz_a_regra_antiga() {
        let mut detector = PorVolume::new(PorVolume::LIMIAR_ANTIGO);

        assert!(detector.ha_fala(&bloco(0.1, 0.25)));
        // Ruído baixo de fundo contava como silêncio…
        assert!(!detector.ha_fala(&bloco(0.1, 0.005)));
        // …e voz baixa também: o defeito que o VAD corrige.
        assert!(!detector.ha_fala(&bloco(0.1, 0.008)));
        assert!(!detector.ha_fala(&[]));
    }

    /// O contrato com o frontend (src/db/transcricao.ts): camelCase, e o id
    /// do Trecho só quando a Janela fechou com fala.
    #[test]
    fn o_corte_viaja_em_camel_case_com_o_id_do_trecho() {
        let com_fala = Corte {
            fechou: true,
            trecho: Some(7),
        };
        assert_eq!(
            serde_json::to_string(&com_fala).unwrap(),
            r#"{"fechou":true,"trecho":7}"#
        );
        assert_eq!(
            serde_json::to_string(&Corte::JANELA_ABERTA).unwrap(),
            r#"{"fechou":false,"trecho":null}"#
        );
    }

    #[test]
    fn sem_gravacao_em_andamento_blocos_e_descargas_sao_ignorados() {
        let gravador = Gravador::default();
        assert_eq!(gravador.registrar(1, &bloco(0.1, 0.25)).unwrap(), Corte::JANELA_ABERTA);
        assert_eq!(gravador.descarregar(1).unwrap(), None);
        assert!(gravador.retirar_trecho(1).unwrap().is_none());
    }

    /// Testes com o Silero de verdade: só quando o modelo está nos
    /// recursos (`mise run modelo`); sem ele, passam em branco.
    mod com_o_modelo {
        use super::*;

        fn caminho_vad() -> Option<std::path::PathBuf> {
            let caminho = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("recursos/modelos")
                .join(ARQUIVO_VAD);
            if caminho.is_file() {
                Some(caminho)
            } else {
                eprintln!("modelo VAD ausente; teste pulado");
                None
            }
        }

        fn detector(normalizar: bool) -> Option<PorVad> {
            let caminho = caminho_vad()?;
            Some(
                PorVad::new(&caminho.to_string_lossy(), PorVad::LIMIAR_DO_APP, normalizar)
                    .expect("carregar o Silero"),
            )
        }

        /// Fala sintética em pt-BR (`say -v Luciana`), 16 kHz mono, pico a
        /// −3 dBFS: a única voz que os testes podem carregar consigo.
        fn fala() -> Vec<f32> {
            let bytes = include_bytes!("../testes/fala.wav");
            let mut leitor = hound::WavReader::new(std::io::Cursor::new(&bytes[..]))
                .expect("fixture de fala");
            assert_eq!(leitor.spec().sample_rate as usize, TAXA_AMOSTRAGEM);
            leitor
                .samples::<i16>()
                .map(|amostra| amostra.expect("amostra") as f32 / 32768.0)
                .collect()
        }

        /// Alimenta o detector em blocos de 85 ms e conta em quantos ele
        /// ouviu fala.
        fn blocos_com_fala(detector: &mut PorVad, amostras: &[f32]) -> usize {
            amostras
                .chunks(1365)
                .filter(|bloco| detector.ha_fala(bloco))
                .count()
        }

        #[test]
        fn fala_a_nivel_normal_e_reconhecida() {
            let Some(mut detector) = detector(false) else { return };
            let fala = fala();
            let total = fala.len().div_ceil(1365);
            let positivos = blocos_com_fala(&mut detector, &fala);
            assert!(positivos * 2 > total, "só {positivos} de {total} blocos com fala");
        }

        /// O defeito que o ganho automático corrige: a mesma fala a −50 dBFS
        /// (voz baixa a 2 m) passa despercebida sem o ganho e é ouvida com ele.
        #[test]
        fn voz_baixa_a_2_m_so_e_reconhecida_com_o_ganho() {
            let Some(mut sem_ganho) = detector(false) else { return };
            let Some(mut com_ganho) = detector(true) else { return };
            let baixa: Vec<f32> = fala().iter().map(|a| a * 0.005).collect();
            let total = baixa.len().div_ceil(1365);

            let sem = blocos_com_fala(&mut sem_ganho, &baixa);
            let com = blocos_com_fala(&mut com_ganho, &baixa);
            assert!(com * 2 > total, "com ganho: só {com} de {total} blocos com fala");
            assert!(com > sem, "o ganho deveria ouvir mais fala: {com} contra {sem}");
        }

        /// Um tom puro não é voz, e silêncio menos ainda — mesmo com o ganho.
        #[test]
        fn silencio_e_tom_puro_nao_sao_fala() {
            let Some(mut detector) = detector(true) else { return };
            let silencio = vec![0.0f32; 1365];
            for _ in 0..12 {
                assert!(!detector.ha_fala(&silencio));
            }
            let tom: Vec<f32> = (0..1365)
                .map(|i| 0.3 * (i as f32 * 440.0 * std::f32::consts::TAU / 16000.0).sin())
                .collect();
            let mut positivos = 0;
            for _ in 0..12 {
                if detector.ha_fala(&tom) {
                    positivos += 1;
                }
            }
            assert!(positivos <= 2, "tom puro tomado por fala {positivos} vezes");
        }

        #[test]
        fn reiniciar_esquece_o_historico() {
            let Some(mut detector) = detector(true) else { return };
            detector.ha_fala(&vec![0.1f32; 16000]);
            detector.reiniciar();
            assert!(detector.historico.is_empty());
            assert!(detector.pendente.is_empty());
            assert!(!detector.ultima_decisao);
        }

        /// Entre duas avaliações (um lote de 0,25 s) vale a última decisão;
        /// o primeiro lote de silêncio decide "sem fala".
        #[test]
        fn blocos_entre_avaliacoes_levam_a_ultima_decisao() {
            let Some(mut detector) = detector(true) else { return };
            let silencio = vec![0.0f32; 1365];
            assert!(!detector.ha_fala(&silencio));
            assert!(!detector.ha_fala(&silencio));
            assert!(!detector.ha_fala(&silencio));
            assert!(detector.pendente.is_empty(), "o terceiro bloco fecha o lote");
        }

        /// Ids crescentes; blocos e descarga de outra gravação são ignorados.
        #[test]
        fn cada_gravacao_tem_id_e_so_responde_pelos_proprios_blocos() {
            let Some(vad) = caminho_vad() else { return };
            let gravador = Gravador::default();
            let primeira = gravador.iniciar(&vad).unwrap();
            assert_eq!(primeira, 1);

            // Silêncio digital: o VAD não ouve fala; a Janela fecha vazia aos 12 s.
            let silencio = vec![0.0f32; 1365];
            let cortes: Vec<Corte> = (0..141)
                .map(|_| gravador.registrar(primeira, &silencio).unwrap())
                .collect();
            let fechadas: Vec<&Corte> = cortes.iter().filter(|c| c.fechou).collect();
            assert_eq!(fechadas.len(), 1);
            assert_eq!(fechadas[0].trecho, None);
            // Bloco com o id errado: ignorado, a Janela continua a mesma.
            assert_eq!(gravador.registrar(99, &silencio).unwrap(), Corte::JANELA_ABERTA);

            // Fala e a descarga: o resto vira Trecho.
            for bloco in fala().chunks(1365) {
                gravador.registrar(primeira, bloco).unwrap();
            }
            let resto = gravador.descarregar(primeira).unwrap().expect("restou fala");
            let pendente = gravador.retirar_trecho(resto).unwrap().expect("trecho na fila");
            assert!(!pendente.amostras.is_empty());
            // Uma vez só.
            assert!(gravador.retirar_trecho(resto).unwrap().is_none());
            assert_eq!(gravador.descarregar(primeira).unwrap(), None);
        }

        /// Religar depressa: a gravação nova encerra a anterior, e o que
        /// restou dela continua recuperável pelo id dela.
        #[test]
        fn uma_gravacao_nova_nao_perde_o_resto_da_anterior() {
            let Some(vad) = caminho_vad() else { return };
            let gravador = Gravador::default();
            let primeira = gravador.iniciar(&vad).unwrap();
            for bloco in fala().chunks(1365) {
                gravador.registrar(primeira, bloco).unwrap();
            }
            let segunda = gravador.iniciar(&vad).unwrap();
            assert_eq!(segunda, 2);

            // Blocos atrasados da primeira não entram na segunda.
            assert_eq!(gravador.registrar(primeira, &fala()[..1365]).unwrap(), Corte::JANELA_ABERTA);

            let resto = gravador.descarregar(primeira).unwrap().expect("o resto da primeira");
            assert!(gravador.retirar_trecho(resto).unwrap().is_some());
            // A segunda continua aberta e sem nada a descarregar.
            assert_eq!(gravador.descarregar(segunda).unwrap(), None);
        }
    }
}
