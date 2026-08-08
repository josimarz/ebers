---
status: proposed
---

# SQLite como banco de dados

Consultório de uma única terapeuta, dados 100% locais, backup por cópia de arquivo. Decidimos **SQLite** (via `tauri-plugin-sql` no backend Rust), acessado do frontend com **Drizzle ORM em modo proxy** — arquivo único sem servidor, zero configuração de rede, type-safety de ponta a ponta no TypeScript e migrations geradas pelo `drizzle-kit`. Adequado ao volume de um consultório individual e alinhado ao backup manual documentado na especificação.
