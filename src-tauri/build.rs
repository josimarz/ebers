/// Diretório do modelo Whisper que vai embutido no app (ADR-0008): `mise run
/// modelo` deixa o `ggml-small.bin` aqui, e o `bundle.resources` do
/// tauri.conf.json o copia para `modelos/` nos recursos do bundle.
const DIRETORIO_MODELO_EMBUTIDO: &str = "recursos/modelos";

fn main() {
    // A pasta fica fora do git, e o tauri-build aborta quando um recurso não
    // existe — mas ignora uma pasta vazia. Garantir a pasta aqui é o que deixa
    // `cargo test` e `tauri dev` rodarem sem o modelo baixado.
    std::fs::create_dir_all(DIRETORIO_MODELO_EMBUTIDO)
        .expect("criar o diretório do modelo embutido");

    // O tauri-build só marca como entrada os recursos que encontrou; com a
    // pasta vazia no primeiro build, baixar o modelo depois não reexecutaria
    // este script e o `target/<perfil>/modelos/` ficaria sem ele.
    println!("cargo:rerun-if-changed={DIRETORIO_MODELO_EMBUTIDO}");

    // Um `tauri build` chamado por fora do mise sairia sem modelo, em
    // silêncio; no mínimo, que fique dito.
    let sem_modelo = std::fs::read_dir(DIRETORIO_MODELO_EMBUTIDO)
        .map(|entradas| {
            !entradas
                .flatten()
                .any(|entrada| entrada.file_name().to_string_lossy().ends_with(".bin"))
        })
        .unwrap_or(true);
    if sem_modelo && std::env::var("PROFILE").as_deref() == Ok("release") {
        println!(
            "cargo:warning={DIRETORIO_MODELO_EMBUTIDO} sem modelo (nenhum .bin): o bundle sairá \
             sem o modelo Whisper (rode `mise run modelo` antes de empacotar)"
        );
    }

    tauri_build::build()
}
