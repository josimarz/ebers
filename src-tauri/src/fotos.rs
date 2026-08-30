//! Fotos de perfil do Paciente (spec 1.1; issue #4).
//!
//! Os arquivos vivem no diretório `fotos/`, ao lado do `ebers.db`, para que o
//! backup manual (spec, Operação) cubra banco e fotos numa única cópia. Toda
//! foto é normalizada ao entrar: decodificada, reduzida ao lado máximo de
//! avatar e regravada como JPEG — o que também garante que só imagens de
//! verdade cheguem ao disco.

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Subdiretório das fotos dentro do diretório de dados do app.
pub const DIRETORIO_FOTOS: &str = "fotos";

/// Lado máximo (px) da foto armazenada — avatar exibido pequeno na UI.
const LADO_MAXIMO: u32 = 512;
const QUALIDADE_JPEG: u8 = 85;

/// Normaliza e grava uma foto nova; devolve o nome do arquivo criado.
pub fn salvar(diretorio: &Path, dados: &[u8]) -> Result<String, String> {
    let jpeg = normalizar(dados)?;
    fs::create_dir_all(diretorio)
        .map_err(|erro| format!("Não foi possível criar o diretório de fotos: {erro}"))?;
    let nome = nome_unico();
    fs::write(diretorio.join(&nome), jpeg)
        .map_err(|erro| format!("Não foi possível gravar a foto: {erro}"))?;
    Ok(nome)
}

/// Decodifica qualquer formato aceito, reduz ao lado máximo preservando a
/// proporção (nunca amplia) e reencoda como JPEG (sem canal alfa).
fn normalizar(dados: &[u8]) -> Result<Vec<u8>, String> {
    let imagem = image::load_from_memory(dados)
        .map_err(|_| "O arquivo não é uma imagem válida".to_string())?;
    let imagem = if imagem.width() > LADO_MAXIMO || imagem.height() > LADO_MAXIMO {
        imagem.resize(
            LADO_MAXIMO,
            LADO_MAXIMO,
            image::imageops::FilterType::Triangle,
        )
    } else {
        imagem
    };
    let mut jpeg = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, QUALIDADE_JPEG)
        .encode_image(&imagem.to_rgb8())
        .map_err(|erro| format!("Não foi possível codificar a foto: {erro}"))?;
    Ok(jpeg)
}

/// Nome novo a cada chamada: instante em milissegundos + contador do processo
/// (o contador desempata gravações dentro do mesmo milissegundo).
fn nome_unico() -> String {
    static CONTADOR: AtomicU64 = AtomicU64::new(0);
    let momento = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duracao| duracao.as_millis())
        .unwrap_or(0);
    let sequencia = CONTADOR.fetch_add(1, Ordering::Relaxed);
    format!("foto-{momento}-{sequencia}.jpg")
}

/// Lê os bytes (JPEG) de uma foto já gravada.
pub fn carregar(diretorio: &Path, arquivo: &str) -> Result<Vec<u8>, String> {
    fs::read(diretorio.join(nome_validado(arquivo)?))
        .map_err(|erro| format!("Não foi possível ler a foto: {erro}"))
}

/// Apaga uma foto gravada (troca ou remoção no cadastro).
pub fn remover(diretorio: &Path, arquivo: &str) -> Result<(), String> {
    fs::remove_file(diretorio.join(nome_validado(arquivo)?))
        .map_err(|erro| format!("Não foi possível remover a foto: {erro}"))
}

/// Os nomes gravados no banco vêm de `nome_unico`, mas os comandos — e a rota
/// de Auto-cadastro (servidor.rs) — são fronteiras: um nome com separadores ou
/// `..` sairia do diretório de fotos. Só passa o que é um único componente de
/// caminho.
pub(crate) fn nome_validado(arquivo: &str) -> Result<&str, String> {
    let componente_unico = Path::new(arquivo)
        .file_name()
        .is_some_and(|nome| nome == arquivo);
    if componente_unico {
        Ok(arquivo)
    } else {
        Err(format!("Nome de arquivo de foto inválido: {arquivo:?}"))
    }
}

#[cfg(test)]
mod testes {
    use std::io::Cursor;

    use image::{ImageFormat, Rgb, RgbImage, Rgba, RgbaImage};

    use super::*;

    fn diretorio_de_teste() -> tempfile::TempDir {
        tempfile::tempdir().expect("criar diretório temporário")
    }

    fn png_de_teste(largura: u32, altura: u32) -> Vec<u8> {
        let imagem = RgbImage::from_pixel(largura, altura, Rgb([200, 120, 80]));
        codificar_png(image::DynamicImage::ImageRgb8(imagem))
    }

    fn png_com_transparencia(largura: u32, altura: u32) -> Vec<u8> {
        let imagem = RgbaImage::from_pixel(largura, altura, Rgba([200, 120, 80, 128]));
        codificar_png(image::DynamicImage::ImageRgba8(imagem))
    }

    fn codificar_png(imagem: image::DynamicImage) -> Vec<u8> {
        let mut png = Vec::new();
        imagem
            .write_to(&mut Cursor::new(&mut png), ImageFormat::Png)
            .expect("codificar PNG de teste");
        png
    }

    fn dimensoes_da_foto(diretorio: &Path, arquivo: &str) -> (u32, u32) {
        let bytes = fs::read(diretorio.join(arquivo)).expect("ler a foto gravada");
        let imagem = image::load_from_memory(&bytes).expect("decodificar a foto gravada");
        (imagem.width(), imagem.height())
    }

    #[test]
    fn salvar_grava_a_foto_como_jpeg_no_diretorio() {
        let pasta = diretorio_de_teste();

        let nome = salvar(pasta.path(), &png_de_teste(100, 80)).expect("salvar a foto");

        assert!(nome.ends_with(".jpg"), "nome gerado: {nome}");
        let bytes = fs::read(pasta.path().join(&nome)).expect("a foto deve existir no disco");
        assert_eq!(
            image::guess_format(&bytes).expect("formato reconhecível"),
            ImageFormat::Jpeg
        );
    }

    #[test]
    fn foto_maior_que_o_lado_maximo_e_reduzida_mantendo_a_proporcao() {
        let pasta = diretorio_de_teste();

        let nome = salvar(pasta.path(), &png_de_teste(2000, 1000)).expect("salvar a foto");

        assert_eq!(dimensoes_da_foto(pasta.path(), &nome), (512, 256));
    }

    #[test]
    fn foto_menor_que_o_lado_maximo_mantem_o_tamanho() {
        let pasta = diretorio_de_teste();

        let nome = salvar(pasta.path(), &png_de_teste(100, 80)).expect("salvar a foto");

        assert_eq!(dimensoes_da_foto(pasta.path(), &nome), (100, 80));
    }

    #[test]
    fn foto_com_transparencia_tambem_vira_jpeg() {
        let pasta = diretorio_de_teste();

        let nome =
            salvar(pasta.path(), &png_com_transparencia(64, 64)).expect("salvar a foto RGBA");

        assert_eq!(dimensoes_da_foto(pasta.path(), &nome), (64, 64));
    }

    #[test]
    fn arquivo_que_nao_e_imagem_e_rejeitado_sem_gravar_nada() {
        let pasta = diretorio_de_teste();

        let resultado = salvar(pasta.path(), b"isto nao e uma imagem");

        assert_eq!(
            resultado.expect_err("bytes inválidos não podem virar foto"),
            "O arquivo não é uma imagem válida"
        );
        let vazio = fs::read_dir(pasta.path())
            .map(|conteudo| conteudo.count() == 0)
            .unwrap_or(true);
        assert!(vazio, "nada deve ser gravado quando a imagem é inválida");
    }

    #[test]
    fn carregar_devolve_a_foto_gravada() {
        let pasta = diretorio_de_teste();
        let nome = salvar(pasta.path(), &png_de_teste(60, 40)).expect("salvar a foto");

        let bytes = carregar(pasta.path(), &nome).expect("carregar a foto");

        let imagem = image::load_from_memory(&bytes).expect("decodificar a foto carregada");
        assert_eq!((imagem.width(), imagem.height()), (60, 40));
    }

    #[test]
    fn carregar_foto_inexistente_falha() {
        let pasta = diretorio_de_teste();

        assert!(carregar(pasta.path(), "foto-0-0.jpg").is_err());
    }

    #[test]
    fn remover_apaga_o_arquivo_da_foto() {
        let pasta = diretorio_de_teste();
        let nome = salvar(pasta.path(), &png_de_teste(10, 10)).expect("salvar a foto");

        remover(pasta.path(), &nome).expect("remover a foto");

        assert!(!pasta.path().join(&nome).exists());
        assert!(carregar(pasta.path(), &nome).is_err());
    }

    #[test]
    fn nomes_que_apontam_para_fora_do_diretorio_sao_rejeitados() {
        let raiz = diretorio_de_teste();
        let pasta = raiz.path().join(DIRETORIO_FOTOS);
        fs::create_dir_all(&pasta).expect("criar o diretório de fotos");
        // Um arquivo vizinho do diretório de fotos, como o ebers.db real.
        let vizinho = raiz.path().join("ebers.db");
        fs::write(&vizinho, b"banco").expect("criar o arquivo vizinho");

        for nome in ["../ebers.db", "/etc/passwd", "..", ""] {
            assert!(carregar(&pasta, nome).is_err(), "carregar aceitou {nome:?}");
            assert!(remover(&pasta, nome).is_err(), "remover aceitou {nome:?}");
        }
        assert!(vizinho.exists(), "o arquivo vizinho deve continuar intacto");
    }

    #[test]
    fn cada_foto_gravada_recebe_um_nome_proprio() {
        let pasta = diretorio_de_teste();
        let png = png_de_teste(10, 10);

        let primeiro = salvar(pasta.path(), &png).expect("salvar a primeira foto");
        let segundo = salvar(pasta.path(), &png).expect("salvar a segunda foto");

        assert_ne!(primeiro, segundo);
        assert!(pasta.path().join(&primeiro).exists());
        assert!(pasta.path().join(&segundo).exists());
    }
}
