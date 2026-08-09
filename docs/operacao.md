# Operação: backup manual

Guia para a terapeuta. Todos os dados do Ebers vivem em **uma única pasta** do
computador — o banco de dados (`ebers.db`) e as fotos de perfil (subpasta
`fotos/`). Copiar essa pasta é o backup completo.

## Onde ficam os dados

| Sistema | Pasta de dados do Ebers |
| --- | --- |
| macOS | `~/Library/Application Support/com.josimar.ebers` |
| Windows | `%APPDATA%\com.josimar.ebers` |
| Linux | `~/.config/com.josimar.ebers` |

Dentro dela:

- `ebers.db` — o banco com todos os cadastros, consultas e anotações;
- `fotos/` — as fotos de perfil dos pacientes.

## Como fazer o backup

1. **Feche o Ebers** (o app não pode estar aberto durante a cópia).
2. Copie a pasta de dados inteira (tabela acima) para o destino do backup —
   um HD externo ou pendrive.
3. Nomeie a cópia com a data (ex.: `ebers-backup-2026-08-08`) e guarde mais
   de uma versão.

Para restaurar: com o app fechado, copie o conteúdo do backup de volta para a
pasta de dados, substituindo os arquivos.

> **Importante**: o disco do computador deve estar com a criptografia do
> sistema ativa (FileVault no macOS, BitLocker no Windows) — pré-requisito de
> instalação ([ADR-0005](./adr/0005-criptografia-em-repouso-delegada-ao-so.md)).
> Vale o mesmo para o disco onde o backup é guardado.
