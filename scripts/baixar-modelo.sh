#!/bin/bash
# Baixa os modelos que vão embutidos no app para src-tauri/recursos/modelos/,
# de onde o `tauri build` os copia para dentro do bundle (`bundle.resources`
# em tauri.conf.json): o Whisper `small` (ADR-0008) e o detector de voz
# Silero VAD, em ggml, que decide o que é fala antes do Whisper (issue #34).
# Roda pela task `mise run modelo`, que a `build:macos` chama antes de
# empacotar.
#
# Idempotente: com o arquivo já íntegro no lugar, não baixa de novo. O SHA-256
# é o do LFS de ggerganov/whisper.cpp no Hugging Face — um download truncado
# ou um arquivo trocado não passam. O download vai para um arquivo temporário
# FORA da pasta que o bundle percorre, apagado se algo falhar no meio, para
# um resto de download nunca ir parar no target nem no DMG. Não há retomada:
# se a conexão cair, rode a task de novo e o download recomeça do zero.
#
# Também deixa ao lado a licença MIT do Whisper e do whisper.cpp: os pesos
# podem ser redistribuídos, desde que o aviso de copyright vá junto.
set -euo pipefail

NOME="ggml-small.bin"
URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$NOME"
SHA256="1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b"
# Silero VAD v6.2.0 convertido para ggml pelo próprio projeto whisper.cpp
# (ggml-org/whisper-vad), MIT.
NOME_VAD="ggml-silero-v6.2.0.bin"
URL_VAD="https://huggingface.co/ggml-org/whisper-vad/resolve/main/$NOME_VAD"
SHA256_VAD="2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987"
# O `>/dev/null` descarta o que o `cd` imprime quando resolve via CDPATH —
# sem ele, um `export CDPATH` no shell do desenvolvedor corrompe o caminho.
RECURSOS="$(cd "$(dirname "$0")/.." >/dev/null && pwd)/src-tauri/recursos"
PASTA="$RECURSOS/modelos"
DESTINO="$PASTA/$NOME"
PARCIAL="$RECURSOS/$NOME.parcial"
DESTINO_VAD="$PASTA/$NOME_VAD"
PARCIAL_VAD="$RECURSOS/$NOME_VAD.parcial"
LICENCA="$PASTA/LICENSE.txt"
LICENCA_NOVA="$RECURSOS/LICENSE.txt.nova"

# Download interrompido (erro do curl, Ctrl-C) não deixa o parcial para trás;
# depois do `mv` final os arquivos já não existem e o rm é inócuo.
trap 'rm -f "$PARCIAL" "$PARCIAL_VAD" "$LICENCA_NOVA"' EXIT

sha256_de() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    sha256sum "$1" | cut -d' ' -f1
  fi
}

mkdir -p "$PASTA"

# baixar <nome> <url> <sha256> <destino> <parcial> <tamanho para a mensagem>
baixar() {
  local nome="$1" url="$2" sha="$3" destino="$4" parcial="$5" tamanho="$6"
  if [[ -f "$destino" ]] && [[ "$(sha256_de "$destino")" == "$sha" ]]; then
    echo "Modelo já presente e íntegro: $destino"
    return
  fi
  echo "Baixando $nome (~$tamanho) de $url ..."
  rm -f "$parcial"
  curl --location --fail --retry 3 --retry-all-errors --output "$parcial" "$url"

  if [[ "$(sha256_de "$parcial")" != "$sha" ]]; then
    echo "SHA-256 de $nome não confere; download descartado." >&2
    exit 1
  fi

  mv "$parcial" "$destino"
  echo "Modelo pronto: $destino"
}

baixar "$NOME" "$URL" "$SHA256" "$DESTINO" "$PARCIAL" "488 MB"
baixar "$NOME_VAD" "$URL_VAD" "$SHA256_VAD" "$DESTINO_VAD" "$PARCIAL_VAD" "1 MB"

# A licença só entra ao lado do arquivo que ela cobre, e só é regravada
# quando o texto muda: gravar sempre daria mtime novo ao arquivo, que o
# tauri-build rastreia por `rerun-if-changed` — o build.rs reexecutaria e o
# crate recompilaria à toa a cada `mise run modelo`.
cat > "$LICENCA_NOVA" <<'TEXTO'
Modelo Whisper "small" (ggml-small.bin) e detector de voz Silero VAD
(ggml-silero-v6.2.0.bin), redistribuídos sob a licença MIT.

Pesos do Whisper: Copyright (c) 2022 OpenAI (https://github.com/openai/whisper)
Pesos do Silero VAD: Copyright (c) 2020-present Silero Team
(https://github.com/snakers4/silero-vad)
Conversões para ggml: Copyright (c) 2023-2025 The ggml authors
(https://github.com/ggerganov/whisper.cpp)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
TEXTO
if cmp -s "$LICENCA_NOVA" "$LICENCA"; then
  rm -f "$LICENCA_NOVA"
else
  mv "$LICENCA_NOVA" "$LICENCA"
fi
