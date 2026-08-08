use tauri_plugin_sql::{Migration, MigrationKind};

/// Mesmo banco aberto pelo frontend (src/db/executor.ts).
pub const URL_BANCO: &str = "sqlite:ebers.db";

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
    ]
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
