use std::path::PathBuf;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

pub mod cpf;
pub mod fotos;
pub mod servidor;
pub mod transcricao;

/// Mesmo banco aberto pelo frontend (src/db/executor.ts).
pub const URL_BANCO: &str = "sqlite:ebers.db";

/// O arquivo que o tauri-plugin-sql cria para URL_BANCO, dentro do diretório
/// de configuração do app.
pub const ARQUIVO_BANCO: &str = "ebers.db";

/// Migrações geradas pelo drizzle-kit (src-tauri/migrations), aplicadas pelo
/// tauri-plugin-sql na inicialização do app.
pub fn migracoes() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "criacao_inicial",
            sql: include_str!("../migrations/0000_criacao-inicial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "cadastro_completo_paciente",
            sql: include_str!("../migrations/0001_cadastro-completo-paciente.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "foto_perfil_paciente",
            sql: include_str!("../migrations/0002_foto-perfil-paciente.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "nova_consulta_e_movimentos_de_credito",
            sql: include_str!("../migrations/0003_nova-consulta-e-movimentos-de-credito.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

/// Diretório das fotos de perfil: `fotos/` dentro do diretório de configuração
/// do app — a mesma base onde o tauri-plugin-sql cria o `ebers.db`, para o
/// backup manual (spec, Operação) copiar banco e fotos de um lugar só.
fn diretorio_de_dados(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|erro| format!("Diretório de dados do app indisponível: {erro}"))
}

pub(crate) fn diretorio_de_fotos(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(diretorio_de_dados(app)?.join(fotos::DIRETORIO_FOTOS))
}

/// Diretório dos modelos Whisper: `modelos/` ao lado do `ebers.db`
/// (docs/operacao.md explica à terapeuta como baixar o modelo para lá).
pub(crate) fn diretorio_de_modelos(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(diretorio_de_dados(app)?.join(transcricao::DIRETORIO_MODELOS))
}

/// Caminho do `ebers.db` no disco — o mesmo arquivo que o tauri-plugin-sql
/// abre para URL_BANCO; as rotas do Auto-cadastro (servidor.rs) gravam nele.
pub(crate) fn caminho_do_banco(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(diretorio_de_dados(app)?.join(ARQUIVO_BANCO))
}

/// Recebe os bytes da imagem como corpo bruto do invoke (sem custo de JSON)
/// e devolve o nome do arquivo gravado, que o frontend persiste em `foto`.
#[tauri::command]
fn salvar_foto_paciente(
    app: tauri::AppHandle,
    requisicao: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(dados) = requisicao.body() else {
        return Err("Esperava os bytes da imagem no corpo da chamada".into());
    };
    fotos::salvar(&diretorio_de_fotos(&app)?, dados)
}

#[tauri::command]
fn carregar_foto_paciente(
    app: tauri::AppHandle,
    arquivo: String,
) -> Result<tauri::ipc::Response, String> {
    fotos::carregar(&diretorio_de_fotos(&app)?, &arquivo).map(tauri::ipc::Response::new)
}

#[tauri::command]
fn remover_foto_paciente(app: tauri::AppHandle, arquivo: String) -> Result<(), String> {
    fotos::remover(&diretorio_de_fotos(&app)?, &arquivo)
}

/// Nome do modelo Whisper disponível (ou nulo) — o frontend consulta antes de
/// ligar o microfone, para avisar quando ainda não há modelo baixado.
#[tauri::command]
fn modelo_de_transcricao(app: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(transcricao::localizar_modelo(&diretorio_de_modelos(&app)?)
        .and_then(|caminho| caminho.file_name().map(|nome| nome.to_string_lossy().into_owned())))
}

/// Recebe um trecho de áudio (f32 LE, 16 kHz mono) como corpo bruto do invoke
/// e devolve o texto transcrito. `async` no atributo: a inferência leva
/// segundos e não pode rodar na thread principal — e o corpo bruto
/// (`Request<'_>`) exige a assinatura síncrona.
#[tauri::command(async)]
fn transcrever_audio(
    app: tauri::AppHandle,
    transcritor: tauri::State<'_, transcricao::Transcritor>,
    requisicao: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(dados) = requisicao.body() else {
        return Err("Esperava as amostras de áudio no corpo da chamada".into());
    };
    let amostras = transcricao::amostras_do_corpo(dados)?;
    if amostras.is_empty() {
        return Ok(String::new());
    }
    let caminho = transcricao::localizar_modelo(&diretorio_de_modelos(&app)?)
        .ok_or("Nenhum modelo de transcrição em modelos/ (docs/operacao.md)")?;
    let contexto = transcritor.contexto(&caminho)?;
    transcricao::transcrever(&contexto, &transcricao::com_duracao_minima(amostras))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(URL_BANCO, migracoes())
                .build(),
        )
        .manage(transcricao::Transcritor::default())
        .invoke_handler(tauri::generate_handler![
            salvar_foto_paciente,
            carregar_foto_paciente,
            remover_foto_paciente,
            modelo_de_transcricao,
            transcrever_audio
        ])
        .setup(|app| {
            // O servidor do Auto-cadastro sobe junto com o app (spec 5.1);
            // uma falha aqui não impede o modo desktop de funcionar.
            if let Err(erro) = servidor::iniciar(app.handle()) {
                eprintln!("Servidor do Auto-cadastro não subiu: {erro}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod testes {
    use tauri_plugin_sql::MigrationKind;

    /// Banco em memória com todas as migrações aplicadas em ordem,
    /// como o tauri-plugin-sql faz na inicialização do app.
    fn banco_migrado() -> rusqlite::Connection {
        let conexao =
            rusqlite::Connection::open_in_memory().expect("abrir SQLite em memória");
        for migracao in super::migracoes() {
            conexao
                .execute_batch(migracao.sql)
                .expect("aplicar migração no SQLite");
        }
        conexao
    }

    /// Insere um paciente só com os campos obrigatórios do cadastro (spec 1.1).
    fn inserir_paciente(
        conexao: &rusqlite::Connection,
        nome: &str,
        cpf: &str,
    ) -> Result<usize, rusqlite::Error> {
        conexao.execute(
            "INSERT INTO pacientes (
                nome_completo, data_nascimento, genero, cpf, religiao, telefone_1,
                ja_fez_terapia, toma_medicamento, ja_foi_hospitalizado,
                valor_consulta_centavos
            ) VALUES (?1, '1990-03-10', 'Feminino', ?2, 'Sem religião',
                '(11) 91234-5678', 0, 0, 0, 25000)",
            rusqlite::params![nome, cpf],
        )
    }

    #[test]
    fn migracao_inicial_cria_a_tabela_pacientes() {
        let migracoes = super::migracoes();
        let primeira = migracoes
            .first()
            .expect("deve haver ao menos uma migração");

        assert_eq!(primeira.version, 1);
        assert!(matches!(primeira.kind, MigrationKind::Up));
        assert!(primeira.sql.contains("CREATE TABLE `pacientes`"));
        assert!(primeira.sql.contains("`nome_completo` text NOT NULL"));
    }

    #[test]
    fn migracoes_sao_sequenciais_e_incluem_o_cadastro_completo() {
        let migracoes = super::migracoes();
        assert!(
            migracoes.len() >= 2,
            "o cadastro completo do paciente exige a migração 2"
        );
        for (indice, migracao) in migracoes.iter().enumerate() {
            assert_eq!(migracao.version, (indice + 1) as i64);
            assert!(matches!(migracao.kind, MigrationKind::Up));
        }
    }

    #[test]
    fn migracoes_aplicadas_deixam_a_tabela_pacientes_utilizavel() {
        let conexao = banco_migrado();

        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("inserir paciente com os campos obrigatórios");

        let (nome, valor): (String, i64) = conexao
            .query_row(
                "SELECT nome_completo, valor_consulta_centavos
                 FROM pacientes WHERE cpf = '52998224725'",
                [],
                |linha| Ok((linha.get(0)?, linha.get(1)?)),
            )
            .expect("consultar paciente inserido");

        assert_eq!(nome, "Ana Lima");
        assert_eq!(valor, 25000);
    }

    #[test]
    fn foto_de_perfil_e_opcional_e_guarda_o_nome_do_arquivo() {
        let conexao = banco_migrado();

        // Cadastro sem foto continua válido (campo opcional na spec 1.1).
        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("inserir paciente sem foto");

        conexao
            .execute(
                "UPDATE pacientes SET foto = 'foto-1.jpg' WHERE cpf = '52998224725'",
                [],
            )
            .expect("gravar o nome do arquivo da foto");

        let foto: Option<String> = conexao
            .query_row(
                "SELECT foto FROM pacientes WHERE cpf = '52998224725'",
                [],
                |linha| linha.get(0),
            )
            .expect("consultar a foto do paciente");

        assert_eq!(foto.as_deref(), Some("foto-1.jpg"));
    }

    /// Insere uma Consulta Aberta só com os campos sem valor padrão (spec 2.1).
    fn inserir_consulta_aberta(
        conexao: &rusqlite::Connection,
        paciente_id: i64,
    ) -> Result<usize, rusqlite::Error> {
        conexao.execute(
            "INSERT INTO consultas (paciente_id, iniciado_em, preco_centavos)
             VALUES (?1, '2026-08-08T14:00:00.000Z', 25000)",
            rusqlite::params![paciente_id],
        )
    }

    #[test]
    fn consulta_nasce_aberta_nao_paga_e_com_textos_vazios() {
        let conexao = banco_migrado();
        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("inserir paciente");

        inserir_consulta_aberta(&conexao, 1).expect("inserir consulta");

        let (status, pago, conteudo, notas): (String, i64, String, String) = conexao
            .query_row(
                "SELECT status, pago, conteudo, notas FROM consultas WHERE id = 1",
                [],
                |linha| {
                    Ok((linha.get(0)?, linha.get(1)?, linha.get(2)?, linha.get(3)?))
                },
            )
            .expect("consultar a consulta inserida");

        assert_eq!(status, "Aberta");
        assert_eq!(pago, 0);
        assert_eq!(conteudo, "");
        assert_eq!(notas, "");
    }

    #[test]
    fn cada_paciente_tem_no_maximo_uma_consulta_aberta() {
        let conexao = banco_migrado();
        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("inserir paciente");
        inserir_consulta_aberta(&conexao, 1).expect("primeira Consulta Aberta");

        let segunda = inserir_consulta_aberta(&conexao, 1);
        assert!(
            segunda.is_err(),
            "segunda Aberta do mesmo paciente deveria violar o índice único"
        );

        // Finalizada a primeira, uma nova Aberta volta a ser permitida.
        conexao
            .execute("UPDATE consultas SET status = 'Finalizada' WHERE id = 1", [])
            .expect("finalizar a primeira consulta");
        inserir_consulta_aberta(&conexao, 1)
            .expect("nova Aberta depois de finalizar a anterior");
    }

    #[test]
    fn movimento_consumo_referencia_a_consulta_e_entra_na_soma_do_saldo() {
        let conexao = banco_migrado();
        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("inserir paciente");
        inserir_consulta_aberta(&conexao, 1).expect("inserir consulta");

        conexao
            .execute(
                "INSERT INTO movimentos_credito
                     (paciente_id, tipo, quantidade, ocorrido_em, consulta_id)
                 VALUES (1, 'Consumo', -1, '2026-08-08T14:00:00.000Z', 1)",
                [],
            )
            .expect("registrar o Movimento Consumo");

        let saldo: i64 = conexao
            .query_row(
                "SELECT SUM(quantidade) FROM movimentos_credito WHERE paciente_id = 1",
                [],
                |linha| linha.get(0),
            )
            .expect("somar os movimentos do paciente");

        assert_eq!(saldo, -1);
    }

    #[test]
    fn cpf_e_unico_na_tabela_pacientes() {
        let conexao = banco_migrado();

        inserir_paciente(&conexao, "Ana Lima", "52998224725")
            .expect("primeiro paciente com o CPF");
        let duplicado = inserir_paciente(&conexao, "Bia Souza", "52998224725");

        assert!(
            duplicado.is_err(),
            "CPF duplicado deveria violar a restrição UNIQUE"
        );
    }
}
