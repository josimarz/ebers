# Transcrição de voz offline com Whisper

_Revisto pela [ADR-0008](./0008-modelo-whisper-embutido-no-instalador.md): o parágrafo **Obtenção do modelo** mudou — o `small` passou a vir embutido no instalador (os 466 MB abaixo são MiB: os mesmos 488 MB da ADR-0008), e o guia de operação já não traz o passo a passo do download. `modelos/` ao lado do `ebers.db` continua valendo, agora como exceção que sobrepõe o embutido._

O Conteúdo da consulta é transcrito do microfone em tempo real, e áudio de sessão de terapia é dado clínico sensível — não pode sair da máquina. Decidimos usar **Whisper via whisper.cpp** (`whisper-rs` no backend Rust), execução 100% local em pt-BR, com modelos escaláveis (`tiny`/`base`/`small`) conforme o hardware. Serviços de transcrição em nuvem foram descartados por princípio (privacidade), não por custo.

**Obtenção do modelo**: o arquivo ggml não é empacotado no instalador (75–466 MB inflariam todo update para pagar por um binário que nunca muda). A terapeuta baixa o modelo uma única vez para `modelos/`, ao lado do `ebers.db` (passo a passo no [guia de operação](../operacao.md)); o app usa o melhor arquivo presente (`small` > `base` > `tiny`) e o carrega na primeira transcrição de cada execução. Sem download automático dentro do app — a máquina do consultório não depende de rede, e a pasta de dados continua sendo a única coisa a administrar.
