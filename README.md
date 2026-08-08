# Ebers

Sistema de gerenciamento de pacientes e consultas para o consultório de psicologia de uma única terapeuta. Roda 100% local — nada em nuvem.

- Especificação funcional: [`docs/especificacao.md`](docs/especificacao.md)
- Glossário do domínio: [`CONTEXT.md`](CONTEXT.md)
- Decisões de arquitetura: [`docs/adr/`](docs/adr/)

## Stack

Tauri 2 (backend Rust) · React 19 + TypeScript + Vite (frontend) · SQLite via `tauri-plugin-sql` + Drizzle ORM (modo sqlite-proxy) · Tailwind CSS 4 com o tema padrão do [Glass UI](https://glass-ui.crenspire.com/) · Biome · Vitest + Testing Library · mise

## Desenvolvimento

Pré-requisitos: [mise](https://mise.jdx.dev/) e [rustup](https://rustup.rs/) instalados.

```sh
mise install     # instala/pina as versões de Node e Rust
npm install      # dependências do frontend
mise run dev     # abre o app desktop
mise run test    # testes do frontend (Vitest) e do backend (cargo test)
mise run lint    # Biome: lint + formatação
```

O banco SQLite (`ebers.db`) é criado no diretório de dados do app na primeira execução; as migrações em [`src-tauri/migrations/`](src-tauri/migrations/) são geradas pelo `drizzle-kit` (`mise run db:generate`) e aplicadas pelo backend Rust na inicialização.
