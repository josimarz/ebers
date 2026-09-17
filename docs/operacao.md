# Operação

Guia para a terapeuta.

## Auto-cadastro no tablet

Com o Ebers aberto, qualquer navegador na mesma rede Wi-Fi do consultório
mostra o Auto-cadastro — sem instalar nada no tablet:

1. No Ebers, clique em **Auto-cadastro** (o botão com o código, no canto
   direito do cabeçalho). Abre a janela "Auto-cadastro no tablet".
2. Com o tablet no Wi-Fi do consultório, aponte a câmera dele para o código
   e toque no link que aparece.
3. Salve a página nos favoritos do tablet: o endereço continua valendo
   enquanto o Ebers estiver aberto no computador.

Se um dia o favorito parar de abrir (o roteador pode ter dado outro endereço
ao computador), abra a janela de novo e leia o código outra vez. O endereço
também aparece por extenso embaixo do código (algo como
`http://192.168.0.10:8738`), se preferir digitá-lo no navegador do tablet.

> Se a janela avisar que o Auto-cadastro não está no ar, feche e abra o
> Ebers de novo. Se avisar que o computador não está em nenhuma rede,
> conecte-o ao Wi-Fi do consultório e clique em "Tentar de novo".

Pela rede só existe o formulário de Auto-cadastro; as demais telas ficam
restritas ao app no computador
([ADR-0003](./adr/0003-rede-local-sem-autenticacao.md)).

## Transcrição de voz (microfone)

O botão "Ligar microfone" da página da consulta transcreve a fala direto no
campo Conteúdo — todo o processamento acontece no próprio computador, nenhum
áudio sai da máquina
([ADR-0004](./adr/0004-transcricao-offline-com-whisper.md)). Não há nada para
instalar nem baixar para a transcrição: o modelo de voz dela já vem dentro do
Ebers ([ADR-0008](./adr/0008-modelo-whisper-embutido-no-instalador.md)).

> Na primeira vez, o sistema pergunta se o Ebers pode usar o microfone —
> permita. Se o botão avisar "Modelo de transcrição não encontrado", a
> instalação ficou incompleta: peça a quem instalou o Ebers para instalá-lo
> de novo.

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
   download do pacote de português (uma vez, com internet). Esse pacote é do
   próprio macOS, separado do Ebers.
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
- `fotos/` — as fotos de perfil dos pacientes.

Qualquer outra pasta ou arquivo que apareça ali (por exemplo `modelos/` ou
`diagnostico-transcricao.txt`) não precisa ir no backup.

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
