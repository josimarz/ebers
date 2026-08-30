//! Prévia da transcrição (spec 2.3; ADR-0007; issue #17).
//!
//! O reconhecedor de fala do macOS, em modo on-device, ouve o mesmo áudio do
//! microfone e devolve por um canal a Prévia de cada janela — uma janela por
//! trecho que o Whisper (transcricao.rs) vai transcrever. A Transcrição
//! continua sendo só do Whisper; a Prévia é conveniência. Fora do macOS 13+
//! ela não existe: `disponibilidade` responde `Inexistente` e nada mais é
//! chamado.

use serde::Serialize;
use tauri::ipc::Channel;

/// Versão mínima do macOS para a Prévia: no 13 o reconhecimento on-device
/// ganhou pontuação automática (`addsPunctuation`) e a API estabilizou.
pub const VERSAO_MINIMA_MACOS: i64 = 13;

pub fn versao_suportada(versao_principal: i64) -> bool {
    versao_principal >= VERSAO_MINIMA_MACOS
}

/// Se a Prévia pode ser mostrada nesta máquina (src/db/previa.ts).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Disponibilidade {
    /// Reconhecimento on-device em pt-BR pronto e autorizado.
    Disponivel,
    /// Existe nesta plataforma, mas falta permissão, Ditado ou o modelo de
    /// pt-BR (docs/operacao.md) — vale um aviso à terapeuta.
    Indisponivel,
    /// Não existe nesta plataforma (fora do macOS, ou macOS anterior ao 13):
    /// nada muda, nem aviso.
    Inexistente,
}

/// O que o reconhecedor devolve ao frontend, sempre com o número da janela:
/// o texto ouvido até agora nela, ou o erro que a encerrou.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "tipo", rename_all = "lowercase")]
pub enum EventoPrevia {
    Texto { janela: u32, texto: String },
    Erro { janela: u32, mensagem: String },
}

/// O que a gravação pede ao reconhecedor.
pub enum Comando {
    Audio(Vec<f32>),
    FecharJanela,
    Parar,
}

/// O que o reconhecedor faz em resposta a um comando.
#[derive(Debug, PartialEq)]
pub enum Passo {
    /// Anexa o áudio à janela aberta.
    Anexar(Vec<f32>),
    /// Encerra a janela `fechada` e abre a `aberta`.
    FecharEAbrir { fechada: u32, aberta: u32 },
    /// Encerra a janela aberta e a Prévia inteira.
    Encerrar { fechada: u32 },
}

/// A máquina de estados das janelas, pura — separada das chamadas ao
/// framework. Numeração a partir de 1, uma a mais a cada fechamento; o
/// frontend (src/dominio/previa.ts) conta do mesmo jeito.
pub struct Janelas {
    aberta: u32,
}

impl Default for Janelas {
    fn default() -> Self {
        Self { aberta: 1 }
    }
}

impl Janelas {
    pub fn aberta(&self) -> u32 {
        self.aberta
    }

    pub fn atender(&mut self, comando: Comando) -> Passo {
        match comando {
            Comando::Audio(amostras) => Passo::Anexar(amostras),
            Comando::FecharJanela => {
                let fechada = self.aberta;
                self.aberta += 1;
                Passo::FecharEAbrir {
                    fechada,
                    aberta: self.aberta,
                }
            }
            Comando::Parar => Passo::Encerrar {
                fechada: self.aberta,
            },
        }
    }
}

/// Estado gerenciado pelo Tauri: o reconhecimento em andamento, se houver.
#[derive(Default)]
pub struct Previa {
    reconhecimento: std::sync::Mutex<Option<plataforma::Reconhecimento>>,
}

impl Previa {
    /// Pede a permissão de Reconhecimento de Fala se ainda não foi decidida.
    pub fn disponibilidade() -> Disponibilidade {
        plataforma::disponibilidade()
    }

    /// Abre a Prévia na janela 1; os eventos vão pelo canal.
    pub fn iniciar(&self, canal: Channel<EventoPrevia>) -> Result<(), String> {
        let novo = plataforma::iniciar(canal)?;
        let mut reconhecimento = self.trancar()?;
        if let Some(anterior) = reconhecimento.take() {
            anterior.parar();
        }
        *reconhecimento = Some(novo);
        Ok(())
    }

    /// Entrega áudio (16 kHz mono) à janela aberta; sem Prévia, ignora —
    /// blocos ainda chegam depois de parar.
    pub fn audio(&self, amostras: Vec<f32>) -> Result<(), String> {
        if let Some(reconhecimento) = self.trancar()?.as_ref() {
            reconhecimento.audio(amostras);
        }
        Ok(())
    }

    /// Fecha a janela aberta e abre a seguinte.
    pub fn fechar_janela(&self) -> Result<(), String> {
        if let Some(reconhecimento) = self.trancar()?.as_ref() {
            reconhecimento.fechar_janela();
        }
        Ok(())
    }

    /// Encerra a Prévia; a janela aberta ainda entrega o que ouviu.
    pub fn parar(&self) -> Result<(), String> {
        if let Some(reconhecimento) = self.trancar()?.take() {
            reconhecimento.parar();
        }
        Ok(())
    }

    fn trancar(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Option<plataforma::Reconhecimento>>, String> {
        self.reconhecimento
            .lock()
            .map_err(|_| "Prévia indisponível".to_string())
    }
}

#[cfg(target_os = "macos")]
mod plataforma {
    //! Implementação sobre o `SFSpeechRecognizer` (framework Speech), via
    //! `objc2`. Os objetos do framework vivem numa thread própria do
    //! reconhecimento e nunca a deixam; os comandos chegam por um canal e os
    //! resultados saem pelo `Channel` do Tauri, a partir da fila do
    //! reconhecedor.

    use std::sync::mpsc::{self, Receiver, Sender};
    use std::time::Duration;

    use block2::RcBlock;
    use objc2::rc::{autoreleasepool, Retained};
    use objc2::AnyThread;
    use objc2_avf_audio::{AVAudioCommonFormat, AVAudioFormat, AVAudioPCMBuffer};
    use objc2_foundation::{NSError, NSLocale, NSOperationQueue, NSProcessInfo, NSString};
    use objc2_speech::{
        SFSpeechAudioBufferRecognitionRequest, SFSpeechRecognitionResult,
        SFSpeechRecognitionTask, SFSpeechRecognitionTaskHint, SFSpeechRecognizer,
        SFSpeechRecognizerAuthorizationStatus,
    };
    use tauri::ipc::Channel;

    use super::{versao_suportada, Comando, Disponibilidade, EventoPrevia, Janelas, Passo};

    /// Taxa em que o frontend entrega o áudio (a mesma do Whisper).
    const TAXA_AMOSTRAGEM: f64 = 16000.0;
    const LOCALE: &str = "pt-BR";
    /// Quanto esperar pela resposta da terapeuta ao diálogo de permissão.
    const ESPERA_PELA_PERMISSAO: Duration = Duration::from_secs(120);
    /// Depois de parar, tempo para os últimos resultados da janela aberta
    /// chegarem antes de soltar as tarefas.
    const ESPERA_PELOS_ULTIMOS_RESULTADOS: Duration = Duration::from_secs(2);

    pub struct Reconhecimento {
        comandos: Sender<Comando>,
    }

    impl Reconhecimento {
        pub fn audio(&self, amostras: Vec<f32>) {
            let _ = self.comandos.send(Comando::Audio(amostras));
        }

        pub fn fechar_janela(&self) {
            let _ = self.comandos.send(Comando::FecharJanela);
        }

        pub fn parar(&self) {
            let _ = self.comandos.send(Comando::Parar);
        }
    }

    fn reconhecedor_pt_br() -> Option<Retained<SFSpeechRecognizer>> {
        let locale = NSLocale::localeWithLocaleIdentifier(&NSString::from_str(LOCALE));
        unsafe { SFSpeechRecognizer::initWithLocale(SFSpeechRecognizer::alloc(), &locale) }
    }

    /// Autorização de "Reconhecimento de Fala" (TCC, separada da do
    /// microfone): pede se ainda não foi decidida e espera a resposta.
    fn autorizado() -> bool {
        unsafe {
            let mut status = SFSpeechRecognizer::authorizationStatus();
            if status == SFSpeechRecognizerAuthorizationStatus::NotDetermined {
                let (tx, rx) = mpsc::channel();
                let bloco = RcBlock::new(move |novo: SFSpeechRecognizerAuthorizationStatus| {
                    let _ = tx.send(novo);
                });
                SFSpeechRecognizer::requestAuthorization(&bloco);
                status = rx
                    .recv_timeout(ESPERA_PELA_PERMISSAO)
                    .unwrap_or(SFSpeechRecognizerAuthorizationStatus::NotDetermined);
            }
            status == SFSpeechRecognizerAuthorizationStatus::Authorized
        }
    }

    pub fn disponibilidade() -> Disponibilidade {
        let versao = NSProcessInfo::processInfo().operatingSystemVersion();
        if !versao_suportada(versao.majorVersion as i64) {
            return Disponibilidade::Inexistente;
        }
        if !autorizado() {
            return Disponibilidade::Indisponivel;
        }
        match reconhecedor_pt_br() {
            // Sem on-device a Prévia não existe: jamais o servidor da Apple.
            Some(reconhecedor)
                if unsafe {
                    reconhecedor.isAvailable() && reconhecedor.supportsOnDeviceRecognition()
                } =>
            {
                Disponibilidade::Disponivel
            }
            _ => Disponibilidade::Indisponivel,
        }
    }

    pub fn iniciar(canal: Channel<EventoPrevia>) -> Result<Reconhecimento, String> {
        let (tx, rx) = mpsc::channel();
        std::thread::Builder::new()
            .name("previa".into())
            .spawn(move || rodar(rx, canal))
            .map_err(|erro| format!("Não foi possível iniciar a Prévia: {erro}"))?;
        Ok(Reconhecimento { comandos: tx })
    }

    /// Formato dos buffers entregues ao reconhecedor: float32 mono a 16 kHz,
    /// o mesmo do áudio que o frontend manda.
    pub(super) fn formato() -> Option<Retained<AVAudioFormat>> {
        unsafe {
            AVAudioFormat::initWithCommonFormat_sampleRate_channels_interleaved(
                AVAudioFormat::alloc(),
                AVAudioCommonFormat::PCMFormatFloat32,
                TAXA_AMOSTRAGEM,
                1,
                false,
            )
        }
    }

    /// Copia as amostras para um buffer PCM do framework.
    pub(super) fn buffer_pcm(
        formato: &AVAudioFormat,
        amostras: &[f32],
    ) -> Option<Retained<AVAudioPCMBuffer>> {
        if amostras.is_empty() {
            return None;
        }
        unsafe {
            let buffer = AVAudioPCMBuffer::initWithPCMFormat_frameCapacity(
                AVAudioPCMBuffer::alloc(),
                formato,
                amostras.len() as u32,
            )?;
            let canais = buffer.floatChannelData();
            if canais.is_null() {
                return None;
            }
            std::ptr::copy_nonoverlapping(
                amostras.as_ptr(),
                (*canais).as_ptr(),
                amostras.len(),
            );
            buffer.setFrameLength(amostras.len() as u32);
            Some(buffer)
        }
    }

    /// Lê de volta as amostras de um buffer (só para os testes).
    #[cfg(test)]
    pub(super) fn amostras_do_buffer(buffer: &AVAudioPCMBuffer) -> Vec<f32> {
        unsafe {
            let canais = buffer.floatChannelData();
            let total = buffer.frameLength() as usize;
            std::slice::from_raw_parts((*canais).as_ptr(), total).to_vec()
        }
    }

    /// Uma janela: o request aberto e a tarefa que o consome. A tarefa fica
    /// retida até o reconhecimento acabar, para os últimos resultados ainda
    /// chegarem.
    struct Janela {
        request: Retained<SFSpeechAudioBufferRecognitionRequest>,
        _tarefa: Retained<SFSpeechRecognitionTask>,
    }

    fn abrir_janela(
        reconhecedor: &SFSpeechRecognizer,
        numero: u32,
        canal: &Channel<EventoPrevia>,
    ) -> Janela {
        unsafe {
            let request = SFSpeechAudioBufferRecognitionRequest::new();
            request.setShouldReportPartialResults(true);
            // Nunca o servidor: sem on-device a Prévia nem começa
            // (disponibilidade).
            request.setRequiresOnDeviceRecognition(true);
            request.setTaskHint(SFSpeechRecognitionTaskHint::Dictation);
            request.setAddsPunctuation(true);
            let canal = canal.clone();
            let bloco = RcBlock::new(
                move |resultado: *mut SFSpeechRecognitionResult, erro: *mut NSError| {
                    if !resultado.is_null() {
                        let texto = (*resultado).bestTranscription().formattedString();
                        let _ = canal.send(EventoPrevia::Texto {
                            janela: numero,
                            texto: texto.to_string(),
                        });
                    }
                    if !erro.is_null() {
                        let _ = canal.send(EventoPrevia::Erro {
                            janela: numero,
                            mensagem: (*erro).localizedDescription().to_string(),
                        });
                    }
                },
            );
            let tarefa = reconhecedor.recognitionTaskWithRequest_resultHandler(&request, &bloco);
            Janela {
                request,
                _tarefa: tarefa,
            }
        }
    }

    /// Laço da thread do reconhecimento: abre a janela 1 e atende os comandos
    /// até parar (ou até a gravação soltar o canal de comandos).
    fn rodar(comandos: Receiver<Comando>, canal: Channel<EventoPrevia>) {
        let erro_inicial = |mensagem: &str| {
            let _ = canal.send(EventoPrevia::Erro {
                janela: 1,
                mensagem: mensagem.to_string(),
            });
        };
        let Some(reconhecedor) = reconhecedor_pt_br() else {
            return erro_inicial("Reconhecedor de fala em pt-BR indisponível");
        };
        let Some(formato) = formato() else {
            return erro_inicial("Formato de áudio da Prévia indisponível");
        };
        // Resultados fora da fila principal: o app não a processa aqui.
        unsafe { reconhecedor.setQueue(&NSOperationQueue::new()) };

        let mut janelas = Janelas::default();
        let mut abertas = vec![abrir_janela(&reconhecedor, janelas.aberta(), &canal)];
        loop {
            let comando = comandos.recv().unwrap_or(Comando::Parar);
            let passo = janelas.atender(comando);
            let continuar = autoreleasepool(|_| match passo {
                Passo::Anexar(amostras) => {
                    if let (Some(janela), Some(buffer)) =
                        (abertas.last(), buffer_pcm(&formato, &amostras))
                    {
                        unsafe { janela.request.appendAudioPCMBuffer(&buffer) };
                    }
                    true
                }
                Passo::FecharEAbrir { aberta, .. } => {
                    if let Some(janela) = abertas.last() {
                        unsafe { janela.request.endAudio() };
                    }
                    abertas.push(abrir_janela(&reconhecedor, aberta, &canal));
                    true
                }
                Passo::Encerrar { .. } => {
                    if let Some(janela) = abertas.last() {
                        unsafe { janela.request.endAudio() };
                    }
                    false
                }
            });
            if !continuar {
                break;
            }
        }
        std::thread::sleep(ESPERA_PELOS_ULTIMOS_RESULTADOS);
        drop(abertas);
    }
}

#[cfg(not(target_os = "macos"))]
mod plataforma {
    //! Fora do macOS não há reconhecedor on-device em pt-BR acessível ao app
    //! (docs/pesquisa/2026-08-transcricao-fluida.md): a Prévia não existe.

    use tauri::ipc::Channel;

    use super::{Disponibilidade, EventoPrevia};

    pub struct Reconhecimento;

    impl Reconhecimento {
        pub fn audio(&self, _amostras: Vec<f32>) {}
        pub fn fechar_janela(&self) {}
        pub fn parar(&self) {}
    }

    pub fn disponibilidade() -> Disponibilidade {
        Disponibilidade::Inexistente
    }

    pub fn iniciar(_canal: Channel<EventoPrevia>) -> Result<Reconhecimento, String> {
        Err("A Prévia só existe no macOS".to_string())
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn a_previa_exige_macos_13_ou_mais_novo() {
        assert!(!versao_suportada(12));
        assert!(versao_suportada(13));
        assert!(versao_suportada(26));
    }

    /// O contrato com o frontend (src/db/previa.ts): `tipo` discriminando,
    /// sempre com a janela; a disponibilidade em minúsculas.
    #[test]
    fn os_eventos_viajam_com_tipo_e_janela() {
        let texto = EventoPrevia::Texto {
            janela: 2,
            texto: "Sentiu ansiedade".into(),
        };
        assert_eq!(
            serde_json::to_string(&texto).unwrap(),
            r#"{"tipo":"texto","janela":2,"texto":"Sentiu ansiedade"}"#
        );
        let erro = EventoPrevia::Erro {
            janela: 3,
            mensagem: "No speech detected".into(),
        };
        assert_eq!(
            serde_json::to_string(&erro).unwrap(),
            r#"{"tipo":"erro","janela":3,"mensagem":"No speech detected"}"#
        );
        assert_eq!(
            serde_json::to_string(&Disponibilidade::Inexistente).unwrap(),
            r#""inexistente""#
        );
    }

    /// Uma janela por trecho: cada fechamento abre a seguinte, numerada a
    /// partir de 1 como no frontend; parar encerra a que estava aberta.
    #[test]
    fn as_janelas_abrem_em_sequencia_e_parar_encerra_a_aberta() {
        let mut janelas = Janelas::default();
        assert_eq!(janelas.aberta(), 1);

        assert_eq!(
            janelas.atender(Comando::Audio(vec![0.5])),
            Passo::Anexar(vec![0.5])
        );
        assert_eq!(
            janelas.atender(Comando::FecharJanela),
            Passo::FecharEAbrir {
                fechada: 1,
                aberta: 2
            }
        );
        assert_eq!(
            janelas.atender(Comando::FecharJanela),
            Passo::FecharEAbrir {
                fechada: 2,
                aberta: 3
            }
        );
        assert_eq!(janelas.aberta(), 3);
        assert_eq!(
            janelas.atender(Comando::Parar),
            Passo::Encerrar { fechada: 3 }
        );
    }

    #[cfg(target_os = "macos")]
    mod macos {
        use super::super::plataforma::{amostras_do_buffer, buffer_pcm, formato};

        #[test]
        fn as_amostras_entram_inteiras_no_buffer_do_reconhecedor() {
            let formato = formato().expect("formato");
            let buffer = buffer_pcm(&formato, &[0.25, -0.5, 1.0]).expect("buffer");
            assert_eq!(amostras_do_buffer(&buffer), vec![0.25, -0.5, 1.0]);
        }

        #[test]
        fn sem_amostras_nao_ha_buffer() {
            assert!(buffer_pcm(&formato().expect("formato"), &[]).is_none());
        }
    }
}
