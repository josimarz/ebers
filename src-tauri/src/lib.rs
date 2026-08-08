use tauri_plugin_sql::{Migration, MigrationKind};

/// Mesmo banco aberto pelo frontend (src/db/executor.ts).
pub const URL_BANCO: &str = "sqlite:ebers.db";

/// Migrações geradas pelo drizzle-kit (src-tauri/migrations), aplicadas pelo
/// tauri-plugin-sql na inicialização do app.
pub fn migracoes() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "criacao_inicial",
        sql: include_str!("../migrations/0000_criacao-inicial.sql"),
        kind: MigrationKind::Up,
    }]
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
    fn migracoes_aplicadas_deixam_a_tabela_pacientes_utilizavel() {
        let conexao =
            rusqlite::Connection::open_in_memory().expect("abrir SQLite em memória");

        for migracao in super::migracoes() {
            conexao
                .execute_batch(migracao.sql)
                .expect("aplicar migração no SQLite");
        }

        conexao
            .execute(
                "INSERT INTO pacientes (nome_completo) VALUES (?1)",
                ["Ana Lima"],
            )
            .expect("inserir paciente");
        let nome: String = conexao
            .query_row(
                "SELECT nome_completo FROM pacientes WHERE id = 1",
                [],
                |linha| linha.get(0),
            )
            .expect("consultar paciente inserido");

        assert_eq!(nome, "Ana Lima");
    }
}
