//! Medição da Transcrição sobre o corpus de referência (issue #34).
//!
//! Roda o mesmo pipeline do app — blocos de 85 ms, acumulador, detector de
//! fala, Whisper — sobre as gravações geradas por `scripts/corpus-distante.py`
//! e imprime, por gravação, o WER contra a referência e o tempo gasto. Cada
//! combinação de detector, estratégia, prompt e VAD interno é uma execução;
//! a matriz completa e os resultados ficam em
//! `docs/pesquisa/2026-09-transcricao-a-distancia.md`.
//!
//! Uso (do diretório src-tauri):
//!   cargo run --release --example medir -- \
//!     --modelo recursos/modelos/ggml-small.bin \
//!     --vad recursos/modelos/ggml-silero-v6.2.0.bin \
//!     --corpus <pasta>/distante --detector vad --estrategia feixe5 \
//!     --prompt --saida <pasta de saída>
//!
//! O áudio do corpus fica fora do repositório.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use ebers_lib::gravador::{Acumulador, DetectorDeFala, PorVad, PorVolume};
use ebers_lib::transcricao::{self, Estrategia, Opcoes, TAXA_AMOSTRAGEM};
use whisper_rs::{WhisperContext, WhisperContextParameters};

/// Amostras por bloco a 16 kHz: os 4096 do ScriptProcessorNode a 48 kHz.
const AMOSTRAS_POR_BLOCO: usize = 1365;

#[derive(Clone, Copy, PartialEq)]
enum Detector {
    Volume,
    Vad,
}

struct Argumentos {
    modelo: PathBuf,
    vad: PathBuf,
    corpus: PathBuf,
    detector: Detector,
    limiar: f32,
    estrategia: Estrategia,
    prompt: bool,
    vad_interno: bool,
    normalizar: bool,
    ganho: bool,
    threads: Option<i32>,
    saida: Option<PathBuf>,
}

fn argumentos() -> Argumentos {
    let mut args = std::env::args().skip(1);
    let mut lidos = Argumentos {
        modelo: PathBuf::from("recursos/modelos/ggml-small.bin"),
        vad: PathBuf::from("recursos/modelos/ggml-silero-v6.2.0.bin"),
        corpus: PathBuf::new(),
        detector: Detector::Vad,
        limiar: PorVad::LIMIAR_DO_APP,
        estrategia: Estrategia::Gulosa,
        prompt: false,
        vad_interno: false,
        normalizar: false,
        ganho: false,
        threads: None,
        saida: None,
    };
    while let Some(arg) = args.next() {
        let mut valor = || args.next().expect("valor do argumento");
        match arg.as_str() {
            "--modelo" => lidos.modelo = PathBuf::from(valor()),
            "--vad" => lidos.vad = PathBuf::from(valor()),
            "--corpus" => lidos.corpus = PathBuf::from(valor()),
            "--detector" => {
                lidos.detector = match valor().as_str() {
                    "volume" => Detector::Volume,
                    "vad" => Detector::Vad,
                    outro => panic!("detector desconhecido: {outro}"),
                }
            }
            "--limiar" => lidos.limiar = valor().parse().expect("limiar numérico"),
            "--estrategia" => {
                let texto = valor();
                lidos.estrategia = match texto.as_str() {
                    "gulosa" => Estrategia::Gulosa,
                    outro => Estrategia::Feixe(
                        outro
                            .strip_prefix("feixe")
                            .and_then(|n| n.parse().ok())
                            .expect("estratégia: gulosa ou feixeN"),
                    ),
                };
            }
            "--prompt" => lidos.prompt = true,
            "--vad-interno" => lidos.vad_interno = true,
            "--normalizar" => lidos.normalizar = true,
            "--ganho" => lidos.ganho = true,
            "--threads" => lidos.threads = Some(valor().parse().expect("threads")),
            "--saida" => lidos.saida = Some(PathBuf::from(valor())),
            outro => panic!("argumento desconhecido: {outro}"),
        }
    }
    assert!(lidos.corpus.is_dir(), "--corpus deve ser uma pasta");
    lidos
}

fn ler_wav(caminho: &Path) -> Vec<f32> {
    let mut leitor = hound::WavReader::open(caminho).expect("abrir WAV");
    let spec = leitor.spec();
    assert_eq!(spec.sample_rate as usize, TAXA_AMOSTRAGEM, "WAV a 16 kHz");
    assert_eq!(spec.channels, 1, "WAV mono");
    match spec.sample_format {
        hound::SampleFormat::Int => {
            let escala = (1i64 << (spec.bits_per_sample - 1)) as f32;
            leitor
                .samples::<i32>()
                .map(|amostra| amostra.expect("amostra") as f32 / escala)
                .collect()
        }
        hound::SampleFormat::Float => leitor
            .samples::<f32>()
            .map(|amostra| amostra.expect("amostra"))
            .collect(),
    }
}

/// Normalização para o WER: minúsculas, só letras e dígitos, espaços
/// simples. Igual para hipótese e referência.
fn palavras(texto: &str) -> Vec<String> {
    texto
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|palavra| !palavra.is_empty())
        .map(str::to_string)
        .collect()
}

/// Distância de edição entre sequências de palavras.
fn distancia(referencia: &[String], hipotese: &[String]) -> usize {
    let mut anterior: Vec<usize> = (0..=hipotese.len()).collect();
    let mut atual = vec![0; hipotese.len() + 1];
    for (i, ref_palavra) in referencia.iter().enumerate() {
        atual[0] = i + 1;
        for (j, hip_palavra) in hipotese.iter().enumerate() {
            let custo = usize::from(ref_palavra != hip_palavra);
            atual[j + 1] = (anterior[j] + custo)
                .min(anterior[j + 1] + 1)
                .min(atual[j] + 1);
        }
        std::mem::swap(&mut anterior, &mut atual);
    }
    anterior[hipotese.len()]
}

struct Resultado {
    gravacao: String,
    palavras: usize,
    erros: usize,
    audio_s: f32,
    tempo_s: f32,
    vad_s: f32,
    trechos: usize,
    descartados: usize,
    hipotese: String,
}

fn medir_gravacao(
    wav: &Path,
    contexto: &WhisperContext,
    detector: &mut dyn DetectorDeFala,
    opcoes: &Opcoes,
) -> Resultado {
    let amostras = ler_wav(wav);
    let referencia = fs::read_to_string(wav.with_extension("txt")).expect("referência .txt");
    detector.reiniciar();
    let mut acumulador = Acumulador::default();
    let mut trechos: Vec<Vec<f32>> = Vec::new();
    let mut descartados = 0;
    let mut tempo_vad = 0.0f32;
    for bloco in amostras.chunks(AMOSTRAS_POR_BLOCO) {
        let inicio = Instant::now();
        let fala = detector.ha_fala(bloco);
        tempo_vad += inicio.elapsed().as_secs_f32();
        if let Some(janela) = acumulador.registrar(bloco, fala) {
            match janela.trecho {
                Some(trecho) => trechos.push(trecho),
                None => descartados += 1,
            }
        }
    }
    if let Some(resto) = acumulador.descarregar() {
        trechos.push(resto);
    }

    let inicio = Instant::now();
    let mut hipotese = String::new();
    for trecho in &trechos {
        let texto = transcricao::transcrever(
            contexto,
            &transcricao::com_duracao_minima(trecho.clone()),
            opcoes,
        )
        .expect("transcrever");
        if !texto.is_empty() {
            if !hipotese.is_empty() {
                hipotese.push(' ');
            }
            hipotese.push_str(&texto);
        }
    }
    let tempo_s = inicio.elapsed().as_secs_f32() + tempo_vad;
    let vad_s = tempo_vad;

    let ref_palavras = palavras(&referencia);
    let hip_palavras = palavras(&hipotese);
    Resultado {
        gravacao: wav.file_stem().unwrap().to_string_lossy().into_owned(),
        palavras: ref_palavras.len(),
        erros: distancia(&ref_palavras, &hip_palavras),
        audio_s: amostras.len() as f32 / TAXA_AMOSTRAGEM as f32,
        tempo_s,
        vad_s,
        trechos: trechos.len(),
        descartados,
        hipotese,
    }
}

fn main() {
    // Sem os logs internos do whisper.cpp: o VAD imprimiria quatro linhas por
    // bloco de 85 ms.
    whisper_rs::install_logging_hooks();
    let args = argumentos();
    let opcoes = Opcoes {
        estrategia: args.estrategia,
        prompt: args
            .prompt
            .then(|| transcricao::prompt_medido("Ana Souza")),
        vad_interno: args.vad_interno.then(|| args.vad.clone()),
        threads: args.threads,
        ganho: args.ganho,
    };
    let mut parametros = WhisperContextParameters::default();
    parametros.use_gpu(transcricao::USAR_GPU);
    let contexto = WhisperContext::new_with_params(&args.modelo, parametros)
        .expect("carregar o modelo Whisper");
    let mut detector: Box<dyn DetectorDeFala> = match args.detector {
        Detector::Volume => Box::new(PorVolume::new(PorVolume::LIMIAR_ANTIGO)),
        Detector::Vad => Box::new(
            PorVad::new(&args.vad.to_string_lossy(), args.limiar, args.normalizar)
                .expect("carregar o VAD"),
        ),
    };

    let mut wavs: Vec<PathBuf> = fs::read_dir(&args.corpus)
        .expect("ler o corpus")
        .filter_map(|entrada| entrada.ok().map(|e| e.path()))
        .filter(|caminho| caminho.extension().is_some_and(|ext| ext == "wav"))
        .collect();
    wavs.sort();

    let nome = format!(
        "{}-{}{}{}{}",
        match args.detector {
            Detector::Volume => "volume".to_string(),
            Detector::Vad => format!(
                "vad{}{:.2}",
                if args.normalizar { "n" } else { "" },
                args.limiar
            ),
        },
        match args.estrategia {
            Estrategia::Gulosa => "gulosa".to_string(),
            Estrategia::Feixe(n) => format!("feixe{n}"),
        },
        if args.prompt { "-prompt" } else { "" },
        if args.vad_interno { "-vadinterno" } else { "" },
        if args.ganho { "-ganho" } else { "" },
    );
    let condicao = args
        .corpus
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    println!("# configuração {nome}, condição {condicao}, modelo {}", args.modelo.display());
    println!("gravacao\tpalavras\terros\tWER%\taudio_s\ttempo_s\tvad_s\tvezes_tempo_real\ttrechos\tjanelas_descartadas");
    let mut total_palavras = 0;
    let mut total_erros = 0;
    let mut total_audio = 0.0;
    let mut total_tempo = 0.0;
    for wav in &wavs {
        let resultado = medir_gravacao(wav, &contexto, detector.as_mut(), &opcoes);
        println!(
            "{}\t{}\t{}\t{:.1}\t{:.0}\t{:.1}\t{:.1}\t{:.2}\t{}\t{}",
            resultado.gravacao,
            resultado.palavras,
            resultado.erros,
            100.0 * resultado.erros as f32 / resultado.palavras as f32,
            resultado.audio_s,
            resultado.tempo_s,
            resultado.vad_s,
            resultado.audio_s / resultado.tempo_s,
            resultado.trechos,
            resultado.descartados,
        );
        total_palavras += resultado.palavras;
        total_erros += resultado.erros;
        total_audio += resultado.audio_s;
        total_tempo += resultado.tempo_s;
        if let Some(saida) = &args.saida {
            let pasta = saida.join(&nome).join(&condicao);
            fs::create_dir_all(&pasta).expect("criar pasta de saída");
            fs::write(
                pasta.join(format!("{}.hyp.txt", resultado.gravacao)),
                format!("{}\n", resultado.hipotese),
            )
            .expect("gravar hipótese");
        }
    }
    println!(
        "TOTAL\t{}\t{}\t{:.1}\t{:.0}\t{:.1}\t\t{:.2}\t\t",
        total_palavras,
        total_erros,
        100.0 * total_erros as f32 / total_palavras as f32,
        total_audio,
        total_tempo,
        total_audio / total_tempo,
    );
}
