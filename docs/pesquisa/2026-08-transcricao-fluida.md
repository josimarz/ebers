# Transcrição fluida: medições e alternativas (agosto de 2026)

Pesquisa que sustenta a [ADR-0007](../adr/0007-previa-da-transcricao-pelo-reconhecedor-da-apple.md). Pergunta: como fazer a transcrição da Consulta parecer tempo real, sem que o áudio saia da máquina e sem regredir a precisão do Whisper `small`. Máquina de medição: MacBook Pro i7-9750H (6 núcleos), 16 GB, macOS 26.5.2 — o piso Intel da ADR-0006.

## Onde está a latência hoje

Latência percebida = espera do trecho (≥ 12 s de fala até uma pausa de 0,6 s; teto 28 s) + inferência. O whisper.cpp processa **30 s de encoder em toda chamada**, mesmo para 2 s de áudio (`log_mel_spectrogram` preenche até 30 s; o encoder lê `2·n_ctx` quadros com `n_ctx = 1500` quando `audio_ctx = 0`).

## Medições do Whisper (whisper.cpp 1.8.3 via whisper-rs 0.16, 6 threads, CPU)

Áudio: 84,5 s de pt-BR sintetizado com `say -v Luciana` (serve para tempo, não para precisão). "Qualidade" = configuração do app hoje; "rápido" = `no_context` + `single_segment` + `temperature_inc = 0` + `audio_ctx = 50·dur + 64`.

| Duração | `small` qualidade | `small` rápido | `small-q8_0` rápido | `base` rápido | `tiny` rápido |
| --- | --- | --- | --- | --- | --- |
| 2 s | 2,21 s (RTF 1,10) | 0,34 s | 0,28 s | 0,16 s | 0,07 s |
| 5 s | 2,83 s | 0,75 s | 0,56 s | 0,26 s | 0,14 s |
| 10 s | 3,13 s | 1,35 s | 0,98 s | 0,58 s | 0,25 s |
| 15 s | 3,30 s | 1,97 s | 1,51 s | 0,70 s | 0,36 s |
| 28 s | 6,60 s¹ | 4,32 s | 3,08 s | 1,26 s | 0,75 s |

¹ O fallback de temperatura (`temperature_inc` 0,2) custou ~2 s extras nesse trecho.

Outros achados: `flash_attn` na CPU é **2,5× mais lento** (só faz sentido no Metal, onde vale −33 % no encoder — e o whisper-rs o deixa desligado por padrão); `q8_0` rende ~20–25 % na CPU com texto idêntico ao f16; `base` e `tiny` repetem/erram em janelas curtas; o app usa o default de 4 threads. Piso seguro de `audio_ctx` segundo o mantenedor do whisper.cpp: 768 (abaixo de 512 o decoder entra em repetição).

## Reconhecedor da Apple (probe Swift, mesmo áudio, alimentação em tempo real)

- `SpeechTranscriber`/`SpeechAnalyzer` (macOS 26): `supportedLocales = []` neste Mac Intel — só Apple Silicon.
- `SFSpeechRecognizer(pt-BR)` com `requiresOnDeviceRecognition`: `supportsOnDeviceRecognition = true`; primeira palavra em 0,62 s, atualizações palavra a palavra (~0,5 s); 21 reescritas integrais em 84 s; **reinício silencioso aos 64,5 s** (descartou 861 caracteres, sem `isFinal`); sem pontuação apesar de `addsPunctuation`; erros como "fui Danny difícil" corrigidos segundos depois. Precisa de `NSSpeechRecognitionUsageDescription` no Info.plist e da permissão TCC "Reconhecimento de Fala" (separada da do microfone). Em Rust: `objc2-speech` 0.3.2 (cobre `SFSpeechRecognizer`, `SFSpeechAudioBufferRecognitionRequest`, `SFSpeechRecognitionTask`, `SFTranscription`), `objc2-avf-audio` 0.3.2 (`AVAudioPCMBuffer`), `block2` 0.6.2.

## Motores NVIDIA (sherpa-onnx 1.13.6, int8, CPU; binário estático +30 MB)

| Motor | Custo | Latência | Reescritas | Pontuação |
| --- | --- | --- | --- | --- |
| Parakeet-TDT-0.6B-v3 (offline) | 10 s → 1,16 s; 28 s → 1,96 s; 84 s → 7,41 s | por trecho, como o Whisper | — | sim |
| Nemotron 3.5 ASR Streaming 0.6B, chunk 560 ms | RTF 0,23 (4 threads; não escala além de 4) | < 1 s (atraso mediano de 0,01 s após o bloco) | zero | **não** nesta exportação (o vocabulário tem `. , ? !` e maiúsculas) |
| Nemotron 3.5, chunk 320 ms | RTF 0,40 | < 0,7 s | zero | não |

O Nemotron perde a primeira e a última palavra se o áudio começa na fala e não há flush; com 1 s de silêncio antes e 1,5 s depois o texto sai íntegro. Precisão em pt-BR clínico de ambos: não medida.

## Veredito por opção

| Opção | Prévia | Transcrição | CPU | Custo | Veredito |
| --- | --- | --- | --- | --- | --- |
| Web Speech API | — | — | — | — | inviável: áudio pode ir à Apple/Microsoft sem aviso; inexistente no Linux |
| LocalAgreement-2 (Whisper) | 2–3 s | 4–6 s | 80–90 % contínua | complexidade alta | descartada pela CPU |
| Nemotron 3.5 (Prévia) + Whisper | < 1 s | 12–15 s | ~25 % contínua | +490 MB modelo, +30 MB runtime | reserva, se a Apple falhar |
| `SFSpeechRecognizer` (Prévia) + Whisper | ~0,6 s | 12–15 s | leve | zero download | **escolhida** (ADR-0007) |
| Trocar o Whisper por Parakeet/Nemotron | < 1 s | ~1 s | ~25 % | +modelo/runtime | só com WER clínico e pontuação validados |

## Em aberto

- Gravação de referência do #14 (100 s, 210 palavras): fica **fora do repositório**, em `~/Documents/ebers-referencia/` (`.wav` 16 kHz mono + `referencia.txt`). Toda medição de precisão usa esse par com o mesmo normalizador.
- Pontuação do Nemotron na exportação sherpa-onnx: causa não identificada.
- Ganhos grátis no Whisper (threads, `flash_attn` no Metal, `q8_0`): issue própria.

## Fontes principais

- whisper.cpp: `audio_ctx` — <https://github.com/ggml-org/whisper.cpp/discussions/297>, <https://github.com/ggml-org/whisper.cpp/issues/137>, <https://github.com/ggml-org/whisper.cpp/issues/1855>; flash attention — <https://github.com/ggml-org/whisper.cpp/pull/2152>, <https://github.com/ggml-org/whisper.cpp/releases/tag/v1.8.0>; VAD — <https://github.com/ggml-org/whisper.cpp/pull/3065>; exemplo `stream` — <https://github.com/ggml-org/whisper.cpp/blob/master/examples/stream/stream.cpp>
- LocalAgreement: <https://github.com/ufal/whisper_streaming>, <https://arxiv.org/abs/2307.14743>; SimulStreaming/AlignAtt — <https://github.com/ufal/SimulStreaming>, <https://arxiv.org/abs/2506.17077>
- WebKit (Web Speech usa `SFSpeechRecognizer` e só força on-device se suportado): <https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/cocoa/WebSpeechRecognizerTask.mm>; permissões — <https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/SpeechRecognitionPermissionManager.cpp>; Tauri — <https://github.com/tauri-apps/tauri/issues/6208>; Edge on-device — <https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api>
- Apple: `requiresOnDeviceRecognition` — <https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition>; `supportsOnDeviceRecognition` — <https://developer.apple.com/documentation/Speech/SFSpeechRecognizer/supportsOnDeviceRecognition>; permissão — <https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition>; `SpeechAnalyzer` — <https://developer.apple.com/documentation/speech/speechanalyzer>, <https://developer.apple.com/videos/play/wwdc2025/277/>; disponibilidade do Ditado on-device (pt-BR) — <https://www.apple.com/macos/feature-availability/>; `objc2-speech` — <https://docs.rs/objc2-speech/latest/objc2_speech/>
- NVIDIA: Nemotron 3.5 — <https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b>; Parakeet v3 — <https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3>, <https://arxiv.org/pdf/2509.14128>; sherpa-onnx — <https://github.com/k2-fsa/sherpa-onnx>, pacotes em <https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models>
- Whisper por idioma: <https://arxiv.org/pdf/2212.04356>; alucinação em silêncio — <https://arxiv.org/pdf/2501.11378>
