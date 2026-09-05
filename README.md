# Ebers

Sistema de gerenciamento de pacientes e consultas para o consultório de psicologia de uma única terapeuta. Roda 100% local — nada em nuvem.

- Especificação funcional: [`docs/especificacao.md`](docs/especificacao.md)
- Glossário do domínio: [`CONTEXT.md`](CONTEXT.md)
- Decisões de arquitetura: [`docs/adr/`](docs/adr/)
- Operação (backup manual): [`docs/operacao.md`](docs/operacao.md)
- Sistema de design (tokens, componentes, acessibilidade): [`docs/design.md`](docs/design.md)
- Pesquisas que embasam decisões: [`docs/pesquisa/`](docs/pesquisa/)

## Stack

Tauri 2 (backend Rust) · React 19 + TypeScript + Vite (frontend) · SQLite via `tauri-plugin-sql` + Drizzle ORM (modo sqlite-proxy) · Tailwind CSS 4 com o sistema de design do Ebers — glassmorphism sobre o esqueleto do [Glass UI](https://glass-ui.crenspire.com/), guia em [`docs/design.md`](docs/design.md) · Biome · Vitest + Testing Library · mise

## Desenvolvimento

Pré-requisitos: [mise](https://mise.jdx.dev/) e [rustup](https://rustup.rs/) instalados.

```sh
mise install     # instala/pina as versões de Node e Rust
npm install      # dependências do frontend
mise run dev     # abre o app desktop
mise run test    # testes do frontend (Vitest) e do backend (cargo test)
mise run lint    # Biome: lint + formatação
```

## Distribuição

```sh
mise run build:macos    # binário universal (Intel + Apple Silicon)
```

Universal e não só a arquitetura de quem constrói: cada fatia compila com o próprio `cfg`, então o Whisper usa a GPU via Metal no Apple Silicon e a CPU nos Macs Intel, onde a GPU devolve transcrição ilegível. A linha de base de instruções é fixada em [`src-tauri/.cargo/config.toml`](src-tauri/.cargo/config.toml) para o binário não sair sintonizado na máquina de quem compilou. Ver [ADR-0006](docs/adr/0006-build-de-distribuicao-do-whisper.md).

O modelo de voz (`ggml-small.bin`, 488 MB) vai **embutido** no app ([ADR-0008](docs/adr/0008-modelo-whisper-embutido-no-instalador.md)): `build:macos` depende de `mise run modelo`, que baixa o arquivo uma vez para `src-tauri/recursos/modelos/` (fora do git, SHA-256 conferido), e o `bundle.resources` do [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) o copia para `Contents/Resources/modelos/`. Sem o arquivo ali, `tauri dev` e `cargo test` seguem funcionando — a pasta vazia é ignorada — e o app só encontra modelo na pasta de dados.

O ícone do app (o Ψ sobre o azul da marca, ver [`docs/design.md`](docs/design.md) §2.7) tem como fonte [`src-tauri/icons/icone.svg`](src-tauri/icons/icone.svg); os PNG/ICNS/ICO ao lado são gerados por `mise run icone` — edite o SVG, nunca os gerados.

## Dados

O banco SQLite (`ebers.db`) é criado no diretório de dados do app na primeira execução; as fotos de perfil ficam ao lado dele em `fotos/`. Um modelo Whisper em `modelos/`, também ao lado do banco, sobrepõe o embutido no app — é a exceção para uma máquina que não acompanha o `small`: ponha ali um `ggml-base.bin` ou `ggml-tiny.bin` (entre vários, vale o de melhor qualidade). As migrações em [`src-tauri/migrations/`](src-tauri/migrations/) são geradas pelo `drizzle-kit` (`mise run db:generate`) e aplicadas pelo backend Rust na inicialização.
