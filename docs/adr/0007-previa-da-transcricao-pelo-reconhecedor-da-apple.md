# Prévia da transcrição pelo reconhecedor on-device da Apple

A Transcrição pelo Whisper chega ao Conteúdo 12–15 s depois de falada: o modelo não é streaming e trechos curtos custam precisão (#14). Decidimos mostrar uma **Prévia** produzida pelo `SFSpeechRecognizer` do macOS com `requiresOnDeviceRecognition`, mantendo o Whisper como único produtor da Transcrição ([ADR-0004](./0004-transcricao-offline-com-whisper.md) segue valendo). A Prévia é conveniência: só no macOS (≥ 13), nunca é salva, nunca substitui o Whisper — e, sem reconhecimento on-device disponível, ela simplesmente não inicia. Jamais o servidor da Apple: dado clínico não sai da máquina.

## Alternativas medidas

Medições num i7-9750H (6 núcleos, macOS 26.5), detalhadas em [`docs/pesquisa/2026-08-transcricao-fluida.md`](../pesquisa/2026-08-transcricao-fluida.md):

- **Web Speech API** (`webkitSpeechRecognition`): descartada. No WKWebView o WebKit só força on-device quando `supportsOnDeviceRecognition` é verdadeiro; senão manda o áudio à Apple sem avisar a página, e o JavaScript não tem como saber nem impedir. No WebView2 (Windows) é nuvem; no WebKitGTK (Linux) a API não existe.
- **LocalAgreement-2 com o próprio Whisper** (re-decodificar o buffer a cada 1–2 s e confirmar o prefixo em que duas hipóteses concordam): viável com `audio_ctx` proporcional ao áudio (10 s em 1,35 s, contra 3,1 s hoje) — Prévia em 2–3 s e Transcrição em 4–6 s —, mas com CPU a 80–90 % durante toda a sessão: ventoinha dentro do consultório.
- **Nemotron 3.5 ASR Streaming 0.6B** (NVIDIA, sherpa-onnx int8): streaming de verdade, atraso menor que 1 s, zero reescritas, RTF 0,23. Mas saiu sem pontuação nem maiúsculas, custa +490 MB de modelo e +30 MB de runtime, e sua precisão em pt-BR clínico não foi medida. **Parakeet-TDT-0.6B-v3**: só 1,5–2× mais rápido que o Whisper com `audio_ctx` corrigido — não muda o quadro.
- **`SpeechAnalyzer`** (macOS 26): só Apple Silicon (`supportedLocales` vazio num Mac Intel), fora do piso da [ADR-0006](./0006-build-de-distribuicao-do-whisper.md).
- **`SFSpeechRecognizer` on-device** (escolhido): primeira palavra em 0,62 s, palavra a palavra, sem download nem runtime extra, CPU leve. Custos aceitos, todos toleráveis para texto provisório: só macOS; depende de Ditado ligado e do modelo de pt-BR baixado nos Ajustes do Sistema; reescreve o texto à medida que ouve; sem pontuação; reinicia a tarefa perto de 1 min — contornado com um request por janela do Whisper, o que também alinha a substituição da Prévia pela Transcrição.

## Consequências

- O app passa a linkar o framework Speech, que existe desde o macOS 10.15: o instalador exige essa versão (`bundle.macOS.minimumSystemVersion`), acima do padrão 10.13 do Tauri — sem efeito prático, já que o whisper.cpp da ADR-0006 mira Macs de 2013 em diante, todos capazes do 10.15.
- Fora do macOS 13+ a Prévia simplesmente não existe (`Inexistente`): nada muda na tela, nem aviso. Um Mac elegível sem Ditado ligado ou sem o modelo de pt-BR baixado (`Indisponivel`) recebe um aviso uma vez por execução, e o guia de operação ensina os passos.
