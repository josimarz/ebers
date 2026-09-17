#!/bin/bash
# Roda a matriz de medição da Transcrição (issue #34) sobre o corpus gerado
# por scripts/corpus-distante.py: cada configuração (detector de fala,
# estratégia de decodificação, prompt, VAD interno) em cada condição (limpo,
# distante, distante-baixo), com o harness src-tauri/examples/medir.rs.
#
# Uso: scripts/medir-transcricao.sh <corpus> <resultados> [paralelo|sequencial]
#
# Cada execução deixa <resultados>/<configuração>-<condição>.tsv (WER por
# gravação e total) e as hipóteses em <resultados>/hipoteses/. Em `paralelo`
# (o padrão) as três condições correm ao mesmo tempo, uma configuração após
# a outra: o WER é o mesmo, mas os tempos só valem em `sequencial`, sem
# disputa pela CPU.
set -euo pipefail

CORPUS="$1"
RESULTADOS="$2"
MODO="${3:-paralelo}"
RAIZ="$(cd "$(dirname "$0")/.." >/dev/null && pwd)"
HARNESS="$RAIZ/src-tauri/target/release/examples/medir"
MODELOS="$RAIZ/src-tauri/recursos/modelos"

if [[ ! -x "$HARNESS" ]]; then
  (cd "$RAIZ/src-tauri" && cargo build --release --example medir)
fi
mkdir -p "$RESULTADOS"

# nome | argumentos do harness
# `vadn` = VAD com ganho automático antes do detector (--normalizar), a
# configuração candidata do app; `vad` sem ganho e `volume` são os controles.
CONFIGURACOES=(
  "volume-gulosa|--detector volume --estrategia gulosa"
  "vad0.50-gulosa|--detector vad --limiar 0.5 --estrategia gulosa"
  "vad0.50-feixe5|--detector vad --limiar 0.5 --estrategia feixe5"
  "vadn0.50-gulosa|--detector vad --limiar 0.5 --normalizar --estrategia gulosa"
  "vadn0.50-gulosa-prompt|--detector vad --limiar 0.5 --normalizar --estrategia gulosa --prompt"
  "vadn0.50-gulosa-ganho|--detector vad --limiar 0.5 --normalizar --estrategia gulosa --ganho"
  "vadn0.50-gulosa-prompt-ganho|--detector vad --limiar 0.5 --normalizar --estrategia gulosa --prompt --ganho"
)
CONDICOES=(limpo distante distante-baixo)

executar() {
  local nome="$1" argumentos="$2" condicao="$3"
  local saida="$RESULTADOS/$nome-$condicao.tsv"
  if [[ -s "$saida" ]] && grep -q "^TOTAL" "$saida"; then
    echo "já medido: $nome $condicao"
    return
  fi
  echo "medindo: $nome $condicao"
  # Uma execução que falha (ou é interrompida) não derruba a fila da
  # condição: fica o `.parcial` para inspeção e a próxima configuração segue.
  # shellcheck disable=SC2086
  if "$HARNESS" --modelo "$MODELOS/ggml-small.bin" --vad "$MODELOS/ggml-silero-v6.2.0.bin" \
    --corpus "$CORPUS/$condicao" $argumentos --saida "$RESULTADOS/hipoteses" \
    > "$saida.parcial" 2> "$RESULTADOS/$nome-$condicao.err"; then
    mv "$saida.parcial" "$saida"
  else
    echo "falhou: $nome $condicao (ver $RESULTADOS/$nome-$condicao.err)"
  fi
}

medir_condicao() {
  local condicao="$1"
  for configuracao in "${CONFIGURACOES[@]}"; do
    executar "${configuracao%%|*}" "${configuracao#*|}" "$condicao"
  done
}

for condicao in "${CONDICOES[@]}"; do
  if [[ "$MODO" == "sequencial" ]]; then
    medir_condicao "$condicao"
  else
    medir_condicao "$condicao" &
  fi
done
wait
echo "matriz concluída em $RESULTADOS"
