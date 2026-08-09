# Operação

Guia para a terapeuta.

## Auto-cadastro no tablet

Com o Ebers aberto, qualquer navegador na mesma rede Wi-Fi do consultório
mostra o Auto-cadastro — sem instalar nada no tablet:

1. Descubra o IP do computador do consultório (macOS: Ajustes do Sistema →
   Wi-Fi → Detalhes; Windows: Configurações → Rede e Internet).
2. No navegador do tablet, acesse `http://IP-do-computador:8738` (ex.:
   `http://192.168.0.10:8738`) e salve nos favoritos.

Pela rede só existe o formulário de Auto-cadastro; as demais telas ficam
restritas ao app no computador
([ADR-0003](./adr/0003-rede-local-sem-autenticacao.md)).

## Transcrição de voz (microfone)

O botão "Ligar microfone" da página da consulta transcreve a fala direto no
campo Conteúdo — todo o processamento acontece no próprio computador, nenhum
áudio sai da máquina
([ADR-0004](./adr/0004-transcricao-offline-com-whisper.md)). Antes do
primeiro uso, é preciso baixar o modelo de voz, uma única vez:

1. Baixe **um** dos modelos abaixo (quanto maior, melhor a transcrição —
   escolha o que o computador comportar):

   | Modelo | Arquivo | Tamanho | Indicado para |
   | --- | --- | --- | --- |
   | small | [`ggml-small.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin) | ~466 MB | computadores recentes (ex.: Mac com Apple Silicon) |
   | base | [`ggml-base.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin) | ~142 MB | o equilíbrio para a maioria das máquinas |
   | tiny | [`ggml-tiny.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin) | ~75 MB | computadores mais antigos |

2. Crie a subpasta `modelos` dentro da pasta de dados do Ebers (tabela em
   "Onde ficam os dados", abaixo) e mova o arquivo baixado para lá, **sem
   renomear**.
3. Pronto: na próxima consulta, ligue o microfone e fale normalmente. Se
   houver mais de um modelo na pasta, o Ebers usa o de melhor qualidade.

> Na primeira vez, o sistema pergunta se o Ebers pode usar o microfone —
> permita. Se o botão avisar "Modelo de transcrição não instalado", confira o
> nome e o lugar do arquivo.

## Backup manual

Todos os dados do Ebers vivem em **uma única pasta** do
computador — o banco de dados (`ebers.db`) e as fotos de perfil (subpasta
`fotos/`). Copiar essa pasta é o backup completo.

### Onde ficam os dados

| Sistema | Pasta de dados do Ebers |
| --- | --- |
| macOS | `~/Library/Application Support/com.josimar.ebers` |
| Windows | `%APPDATA%\com.josimar.ebers` |
| Linux | `~/.config/com.josimar.ebers` |

Dentro dela:

- `ebers.db` — o banco com todos os cadastros, consultas e anotações;
- `fotos/` — as fotos de perfil dos pacientes;
- `modelos/` — o modelo de voz da transcrição. Pode ficar fora do backup:
  se perder, é só baixar de novo (seção acima).

### Como fazer o backup

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
