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

O modelo de voz **não** é empacotado: quem instalar precisa baixá-lo uma vez ([`docs/operacao.md`](docs/operacao.md)). Sem ele o app funciona normalmente e o botão do microfone avisa o que falta.

O ícone do app (o Ψ sobre o azul da marca, ver [`docs/design.md`](docs/design.md) §2.7) tem como fonte [`src-tauri/icons/icone.svg`](src-tauri/icons/icone.svg); os PNG/ICNS/ICO ao lado são gerados por `mise run icone` — edite o SVG, nunca os gerados.

## Dados

O banco SQLite (`ebers.db`) é criado no diretório de dados do app na primeira execução; as fotos de perfil ficam ao lado dele em `fotos/` e o modelo Whisper da transcrição de voz em `modelos/` (ver [`docs/operacao.md`](docs/operacao.md)); as migrações em [`src-tauri/migrations/`](src-tauri/migrations/) são geradas pelo `drizzle-kit` (`mise run db:generate`) e aplicadas pelo backend Rust na inicialização.
