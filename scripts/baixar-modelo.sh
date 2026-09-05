#!/bin/bash
# Baixa o modelo Whisper que vai embutido no app (ADR-0008) para
# src-tauri/recursos/modelos/, de onde o `tauri build` o copia para dentro do
# bundle (`bundle.resources` em tauri.conf.json). Roda pela task
# `mise run modelo`, que a `build:macos` chama antes de empacotar.
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
# O `>/dev/null` descarta o que o `cd` imprime quando resolve via CDPATH —
# sem ele, um `export CDPATH` no shell do desenvolvedor corrompe o caminho.
RECURSOS="$(cd "$(dirname "$0")/.." >/dev/null && pwd)/src-tauri/recursos"
PASTA="$RECURSOS/modelos"
DESTINO="$PASTA/$NOME"
PARCIAL="$RECURSOS/$NOME.parcial"
LICENCA="$PASTA/LICENSE.txt"
LICENCA_NOVA="$RECURSOS/LICENSE.txt.nova"

# Download interrompido (erro do curl, Ctrl-C) não deixa o parcial para trás;
# depois do `mv` final os arquivos já não existem e o rm é inócuo.
trap 'rm -f "$PARCIAL" "$LICENCA_NOVA"' EXIT

sha256_de() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    sha256sum "$1" | cut -d' ' -f1
  fi
}

mkdir -p "$PASTA"

if [[ -f "$DESTINO" ]] && [[ "$(sha256_de "$DESTINO")" == "$SHA256" ]]; then
  echo "Modelo já presente e íntegro: $DESTINO"
else
  echo "Baixando $NOME (~488 MB) de $URL ..."
  rm -f "$PARCIAL"
  curl --location --fail --retry 3 --retry-all-errors --output "$PARCIAL" "$URL"

  if [[ "$(sha256_de "$PARCIAL")" != "$SHA256" ]]; then
    echo "SHA-256 de $NOME não confere; download descartado." >&2
    exit 1
  fi

  mv "$PARCIAL" "$DESTINO"
  echo "Modelo pronto: $DESTINO"
fi

# A licença só entra ao lado do arquivo que ela cobre, e só é regravada
# quando o texto muda: gravar sempre daria mtime novo ao arquivo, que o
# tauri-build rastreia por `rerun-if-changed` — o build.rs reexecutaria e o
# crate recompilaria à toa a cada `mise run modelo`.
cat > "$LICENCA_NOVA" <<'TEXTO'
Modelo Whisper "small" (ggml-small.bin), redistribuído sob a licença MIT.

Pesos do modelo: Copyright (c) 2022 OpenAI (https://github.com/openai/whisper)
Conversão para ggml: Copyright (c) 2023-2024 The ggml authors
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
