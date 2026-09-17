//! Diagnóstico da transcrição (issue #34): um arquivo de texto na pasta de
//! dados, ao lado do `ebers.db`, com o que o desenvolvedor precisa saber
//! sobre a máquina do consultório sem estar lá — processador, sistema,
//! modelo em uso e quanto mais rápido que a fala cada trecho foi transcrito.
//! **Nunca** contém texto transcrito: só números e caminhos. A terapeuta não
//! o vê; o guia de operação diz que a pasta de dados pode ter outros arquivos.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::time::Duration;

pub const ARQUIVO: &str = "diagnostico-transcricao.txt";

/// Acima disto o arquivo recomeça do zero na gravação seguinte: o que
/// interessa é sempre a última semana, não o histórico.
const TAMANHO_MAXIMO: u64 = 64 * 1024;

/// Uma linha por Trecho: duração do áudio, tempo gasto, a razão entre eles
/// (1,0 = na velocidade da fala; abaixo disso a Transcrição atrasa) e o
/// modelo que transcreveu — o cabeçalho diz o de maior precedência, mas a
/// reserva pode ter assumido (ADR-0008).
pub fn linha_do_trecho(audio: Duration, gasto: Duration, modelo: &Path) -> String {
    let razao = if gasto.is_zero() {
        f32::INFINITY
    } else {
        audio.as_secs_f32() / gasto.as_secs_f32()
    };
    format!(
        "trecho: {:.1} s de áudio em {:.1} s ({:.1}x a velocidade da fala), {}",
        audio.as_secs_f32(),
        gasto.as_secs_f32(),
        razao,
        modelo
            .file_name()
            .map(|nome| nome.to_string_lossy().into_owned())
            .unwrap_or_default()
    )
}

/// Cabeçalho de cada gravação: máquina, sistema e modelos em uso.
pub fn cabecalho(momento: &str, modelo: &Path, vad: &Path) -> String {
    format!(
        "== gravação iniciada em {momento} ==\nmáquina: {}\nnúcleos: {}\nsistema: {}\nmodelo: {}\ndetector de voz: {}\n",
        processador(),
        std::thread::available_parallelism().map_or(0, |n| n.get()),
        sistema(),
        modelo.display(),
        vad.display(),
    )
}

/// Uma gravação começou: cabeçalho com a data e a hora locais.
pub fn registrar_inicio(pasta_de_dados: &Path, modelo: &Path, vad: &Path) {
    let momento = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    anexar(pasta_de_dados, &cabecalho(&momento, modelo, vad));
}

/// Um Trecho foi transcrito.
pub fn registrar_trecho(pasta_de_dados: &Path, audio: Duration, gasto: Duration, modelo: &Path) {
    anexar(pasta_de_dados, &linha_do_trecho(audio, gasto, modelo));
}

/// Acrescenta texto ao arquivo de diagnóstico, recomeçando-o quando passa do
/// tamanho máximo. Falhas são ignoradas: diagnóstico nunca derruba a
/// transcrição.
pub fn anexar(pasta_de_dados: &Path, texto: &str) {
    let caminho = pasta_de_dados.join(ARQUIVO);
    let recomecar = std::fs::metadata(&caminho).is_ok_and(|m| m.len() > TAMANHO_MAXIMO);
    let arquivo = OpenOptions::new()
        .create(true)
        .append(!recomecar)
        .write(true)
        .truncate(recomecar)
        .open(&caminho);
    if let Ok(mut arquivo) = arquivo {
        let _ = writeln!(arquivo, "{texto}");
    }
}

fn comando(programa: &str, argumentos: &[&str]) -> Option<String> {
    let saida = std::process::Command::new(programa)
        .args(argumentos)
        .output()
        .ok()?;
    let texto = String::from_utf8_lossy(&saida.stdout).trim().to_string();
    (!texto.is_empty()).then_some(texto)
}

fn processador() -> String {
    if cfg!(target_os = "macos") {
        comando("sysctl", &["-n", "machdep.cpu.brand_string"])
    } else {
        std::fs::read_to_string("/proc/cpuinfo").ok().and_then(|texto| {
            texto
                .lines()
                .find(|linha| linha.starts_with("model name"))
                .and_then(|linha| linha.split(':').nth(1))
                .map(|nome| nome.trim().to_string())
        })
    }
    .unwrap_or_else(|| "desconhecido".to_string())
}

fn sistema() -> String {
    if cfg!(target_os = "macos") {
        comando("sw_vers", &["-productVersion"]).map(|versao| format!("macOS {versao}"))
    } else {
        None
    }
    .unwrap_or_else(|| std::env::consts::OS.to_string())
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn a_linha_do_trecho_traz_duracao_tempo_razao_e_modelo() {
        assert_eq!(
            linha_do_trecho(
                Duration::from_secs_f32(13.0),
                Duration::from_secs_f32(3.25),
                Path::new("/app/modelos/ggml-small.bin")
            ),
            "trecho: 13.0 s de áudio em 3.2 s (4.0x a velocidade da fala), ggml-small.bin"
        );
    }

    /// O arquivo é só números e caminhos: o cabeçalho nunca leva texto
    /// transcrito, e cada gravação recomeça o arquivo quando ele cresce demais.
    #[test]
    fn anexa_e_recomeca_quando_passa_do_tamanho() {
        let pasta = tempfile::tempdir().unwrap();
        anexar(pasta.path(), "primeira linha");
        anexar(pasta.path(), "segunda linha");
        let conteudo = std::fs::read_to_string(pasta.path().join(ARQUIVO)).unwrap();
        assert_eq!(conteudo, "primeira linha\nsegunda linha\n");

        std::fs::write(pasta.path().join(ARQUIVO), "x".repeat(TAMANHO_MAXIMO as usize + 1)).unwrap();
        anexar(pasta.path(), "recomeçou");
        let conteudo = std::fs::read_to_string(pasta.path().join(ARQUIVO)).unwrap();
        assert_eq!(conteudo, "recomeçou\n");
    }

    #[test]
    fn o_cabecalho_identifica_maquina_sistema_e_modelos() {
        let texto = cabecalho(
            "2026-09-18 14:00:00",
            Path::new("/app/modelos/ggml-small.bin"),
            Path::new("/app/modelos/ggml-silero-v6.2.0.bin"),
        );
        assert!(texto.starts_with("== gravação iniciada em 2026-09-18 14:00:00 ==\nmáquina: "));
        assert!(texto.contains("\nmodelo: /app/modelos/ggml-small.bin\n"));
        assert!(texto.contains("\ndetector de voz: /app/modelos/ggml-silero-v6.2.0.bin\n"));
    }
}
