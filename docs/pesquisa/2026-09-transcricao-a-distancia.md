# Transcrição a distância: medições (setembro de 2026)

Medições que sustentam a [issue #34](https://github.com/josimarz/ebers/issues/34) e a [ADR-0009](../adr/0009-vozes-na-transcricao-sem-separar-locutores.md). Pergunta: o que o pipeline pode fazer pela fidelidade da Transcrição quando o paciente fala a uns 2 m do MacBook, com a voz da terapeuta mais perto e mais alta, sem mudar o arranjo físico e sem envolver ninguém em gravação. Máquina de medição: MacBook Pro i7-9750H (6 núcleos), 16 GB, macOS 26.6, CPU (o mesmo caminho do Air Intel do consultório, só que mais rápido).

## Método

Ninguém grava nada: o áudio é fala espontânea pública em pt-BR, degradada para parecer distante.

- **Corpus**: split `dev` do [CORAA v1.1](https://huggingface.co/datasets/gabrielrstan/CORAA-v1.1) (entrevistas e conversas espontâneas com transcrição revisada). `scripts/corpus-distante.py` junta trechos consecutivos de uma mesma entrevista em 8 gravações de ~150 s (3 do SP2010, 3 do C-ORAL-Brasil, 2 do ALIP), com pausas de 0,4–1,2 s entre as falas e, de vez em quando, 2–3 s. NURC-Recife ficou de fora (fitas dos anos 1970-80, abafadas: o `small` erra 86% já na condição limpa) e TEDx também (fala de palco). 2.400 palavras de referência por condição.
- **Condições**: `limpo` (as gravações como estão no corpus); `distante` (−14 dB, o que cinco vezes a distância custa, convolução com resposta ao impulso sintética de sala pequena — RT60 0,5 s, razão direto/reverberante 0 dB — e piso de ruído rosa a −58 dBFS); `distante-baixo` (o mesmo a −20 dB: voz baixa a 2 m). RMS resultante das gravações: ~−37, ~−46 e ~−51 dBFS.
- **Harness**: `src-tauri/examples/medir.rs`, o mesmo código do app (blocos de 85 ms, `gravador.rs`, `transcricao.rs`), com o modelo `small` f16 na CPU. WER = distância de edição entre palavras depois de minúsculas e remoção de pontuação; a referência do CORAA mantém hesitações ("né", "aham", repetições) e escreve números por extenso, que o Whisper limpa e grafa em dígitos, então o WER absoluto sai inflado — o que vale é a comparação entre configurações na mesma condição.
- **Configurações**: detector de fala por volume (a regra antiga, RMS < 0,01) ou por VAD (Silero, limiar 0,5 ou 0,3), este com ou sem ganho automático antes do detector (`vadn`: o lote é levado a pico −6 dBFS quando está abaixo); decodificação gulosa ou busca em feixe (5); com ou sem prompt fixo ("Consulta de psicoterapia com Ana Souza. Conversa sobre a semana, a família, o trabalho e como tem se sentido."); com ou sem o VAD interno do whisper.cpp filtrando o não-fala dentro do Trecho; com ou sem o mesmo ganho automático no Trecho antes do Whisper (`ganho`).
- **Tempos**: as três condições correram em paralelo (`scripts/medir-transcricao.sh`), então "vezes a velocidade da fala" só serve para comparar configurações entre si nesta tabela, não como medida absoluta.

## Resultados

WER total (2.397 palavras de referência por condição) e Janelas descartadas — fechadas sem nenhum bloco tido como fala, portanto nunca transcritas — somadas nas oito gravações. Os tempos de Whisper não são comparáveis entre linhas (três processos em paralelo, mais compilações no meio), mas o custo do VAD sim: é a soma do tempo gasto no detector por condição.

| Configuração | `limpo` | `distante` | `distante-baixo` | Janelas descartadas (limpo / distante / distante-baixo) | VAD por 20 min de áudio |
|---|---|---|---|---|---|
| Volume (RMS < 0,01) + gulosa — **o app até aqui** | 28,5 % | 53,7 % | 72,4 % | 0 / 11 / 33 | — |
| VAD 0,5 + gulosa | 26,7 % | 52,3 % | 66,3 % | 0 / 7 / 25 | ~165 s (bloco a bloco) |
| VAD 0,5 + feixe 5 | 27,4 % | pior em 5 das 8 gravações (parcial) | 68,9 % | 0 / – / 25 | idem |
| **VAD 0,5 com ganho automático + gulosa — o app agora** | 27,2 % | 53,7 % | **61,3 %** | **0 / 0 / 0** | ~40–65 s (lotes de 0,25 s) |
| idem + prompt fixo | 31,2 % | 53,9 % | 63,5 % | 0 / 0 / 0 | idem |
| idem + ganho automático também antes do Whisper | 26,7 % | 52,9 % | 64,1 % | 0 / 0 / 0 | idem |

O que cada linha diz:

- **A regra antiga era o problema central na voz baixa.** Com o limiar de volume, 33 das 92 Janelas de `distante-baixo` foram descartadas inteiras (nas gravações 1 e 6, quase tudo: 11 e 10 Janelas de 12), e o que sobrou saiu com texto inventado ("Internacional para As hogos ещё mais de 500 mil cavalcopes…"). Já em `distante`, 11 Janelas descartadas.
- **O Silero sem ganho também não ouve voz a −50 dBFS**: 25 Janelas descartadas em `distante-baixo`, e a gravação 1 continuou 100 % perdida. O ganho automático antes do detector (pico levado a −6 dBFS quando está abaixo, no máximo 30 dB) zera as Janelas descartadas nas três condições e leva `distante-baixo` de 72,4 % para 61,3 %. Em `limpo` e `distante` o resultado fica no ruído da medição (±1 ponto), como esperado: ali o volume nunca foi o gargalo. É a configuração do app: `PorVad::LIMIAR_DO_APP = 0,5`, `NORMALIZAR_NO_APP = true`.
- **Busca em feixe (5)**: pior em `limpo` (27,4 contra 26,7 %) e em `distante-baixo` (68,9 contra 66,3 %), pior em 5 das 8 gravações de `distante` quando foi interrompida, e 20–30 % mais lenta. Confirma a #14 (sem ganho no `small`). Fica de fora.
- **Prompt fixo** ("Consulta de psicoterapia com Ana Souza. Conversa sobre a semana, a família, o trabalho e como tem se sentido."): pior nas três condições, e 4 pontos pior em `limpo`. Dois mecanismos vistos nas hipóteses: trechos inteiros de fala somem (o modelo pula do meio de uma frase para outra) e o texto do prompt vaza para a transcrição ("psicoterapia", "Ana Souza", "como tem se sentido" apareceram sete vezes onde ninguém os disse). Fica de fora, e o app não manda o nome do Paciente ao Whisper.
- **Ganho automático também antes do Whisper**: ±0,5 ponto em `limpo` e `distante`, e pior em `distante-baixo` (64,1 contra 61,3 %; a gravação 7 foi de 60,9 para 78,0 %). O log-mel do whisper.cpp não é invariante ao nível, mas amplificar ruído junto com a voz não ajuda. Fica de fora.
- **VAD interno do whisper.cpp** (filtrar o não-fala dentro do Trecho antes do encoder) e **limiar 0,3**: não medidos — a fila foi cortada quando o VAD com ganho já não descartava Janela nenhuma. Ficam de fora até que uma medição os sustente.
- **Custo do VAD**: avaliar cada bloco de 85 ms com 1 s de histórico custava ~165 s por 20 min de áudio (14 % de um núcleo); em lotes de 0,25 s com 0,5 s de histórico, 40–65 s (3–5 %). O whisper.cpp zera o estado da LSTM do Silero a cada chamada, então o histórico é o que dá contexto ao lote.

## O que a medição não diz

- O WER absoluto é alto até em `limpo` (27 %) porque a referência do CORAA mantém hesitações e repetições ("né", "aham", "a a a a") e escreve números por extenso, enquanto o Whisper limpa e grafa em dígitos. Serve para comparar configurações, não para prever o erro no consultório.
- A distância continua custando: de `limpo` para `distante`, o erro dobra em toda configuração, como o paper do Whisper mede (AMI-IHM 19,0 % → AMI-SDM1 39,6 % para o `small`). Nenhuma decodificação recupera isso com um microfone só a 2 m; o que o pipeline garante agora é não perder frases inteiras nem inventar texto.
- O corpus não tem duas vozes sobrepostas nem a voz da terapeuta mais perto e mais alta — o que se perde na sobreposição é limitação aceita ([ADR-0009](../adr/0009-vozes-na-transcricao-sem-separar-locutores.md)).
- Os tempos foram medidos com três processos disputando um i7 de 6 núcleos; o Air Intel do consultório é o `diagnostico-transcricao.txt` que vai dizer.

## Fontes

- Paper do Whisper (WER por idioma e por distância do microfone, AMI-IHM × AMI-SDM1): <https://arxiv.org/abs/2212.04356>
- Guia de prompting da OpenAI: <https://cookbook.openai.com/examples/whisper_prompting_guide>
- Alucinação induzida por não-fala e a mitigação por VAD: <https://arxiv.org/abs/2501.11378>
- VAD no whisper.cpp e modelos Silero em ggml: <https://github.com/ggml-org/whisper.cpp>, <https://huggingface.co/ggml-org/whisper-vad>
- Voice processing do WebKit (`VoiceProcessingIO` sempre que `echoCancellation` está ligado): <https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureUnit.cpp>
- CORAA: <https://arxiv.org/abs/2110.15731>
