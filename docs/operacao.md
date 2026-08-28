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

1. Baixe **um** dos modelos abaixo. Comece pelo `small`: ele erra menos da
   metade das palavras que o `base` e ainda transcreve mais rápido do que se
   fala, mesmo num computador de 2019. Só desça na tabela se a máquina não
   acompanhar.

   | Modelo | Arquivo | Tamanho | Indicado para |
   | --- | --- | --- | --- |
   | small | [`ggml-small.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin) | ~466 MB | a escolha recomendada, bem melhor em português |
   | base | [`ggml-base.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin) | ~142 MB | máquinas mais modestas, com perda visível de precisão |
   | tiny | [`ggml-tiny.bin`](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin) | ~75 MB | último recurso, só para computadores antigos |

2. Crie a subpasta `modelos` dentro da pasta de dados do Ebers (tabela em
   "Onde ficam os dados", abaixo) e mova o arquivo baixado para lá, **sem
   renomear**.
3. Pronto: na próxima consulta, ligue o microfone e fale normalmente. Se
   houver mais de um modelo na pasta, o Ebers usa o de melhor qualidade.

> Na primeira vez, o sistema pergunta se o Ebers pode usar o microfone —
> permita. Se o botão avisar "Modelo de transcrição não instalado", confira o
> nome e o lugar do arquivo.

### Prévia: o texto ao vivo (só no macOS)

Enquanto o Whisper transcreve com calma, uma linha em cinza abaixo do campo
Conteúdo mostra o que o microfone está ouvindo naquele momento — a Prévia.
Ela aparece em menos de um segundo, pode se corrigir enquanto você fala e
some quando a transcrição definitiva entra no Conteúdo. Nada dela é salvo, e
o reconhecimento acontece no próprio computador
([ADR-0007](./adr/0007-previa-da-transcricao-pelo-reconhecedor-da-apple.md)).

A Prévia usa o reconhecimento de fala do próprio macOS (13 ou mais novo), que
precisa estar preparado para português do Brasil:

1. Abra **Ajustes do Sistema › Teclado** e, em **Ditado**, ligue o Ditado.
2. Em **Idiomas** do Ditado, adicione **Português (Brasil)** e aguarde o
   download do modelo de voz (uma vez, com internet).
3. Ao ligar o microfone pela primeira vez depois disso, o sistema pergunta se
   o Ebers pode usar o **Reconhecimento de Fala** — permita. É uma permissão
   separada da do microfone.

> Se o botão avisar "Prévia indisponível", a transcrição continua funcionando
> normalmente pelo Whisper — só a linha ao vivo deixa de aparecer. Confira os
> três passos acima; o aviso aparece uma única vez por abertura do app.

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
