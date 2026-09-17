/**
 * Transcrição de voz da Consulta (spec 2.3 e 5.3, ADR-0004): o que o
 * microfone capta vira texto no Conteúdo. Aqui vive a parte pura do fluxo
 * que ficou no frontend — levar o áudio à taxa do Whisper e juntar a
 * Transcrição ao texto existente. Juntar blocos em trechos e decidir o que
 * é fala é papel do backend (src-tauri/src/gravador.rs, issue #34).
 */

/** Taxa de amostragem que o whisper.cpp espera: 16 kHz mono. */
export const TAXA_WHISPER = 16000;

/**
 * Reamostra um canal mono para a taxa do Whisper, por interpolação linear —
 * suficiente para voz. O microfone capta na taxa nativa do hardware (44,1 ou
 * 48 kHz); é aqui que o áudio cai para os 16 kHz do modelo.
 */
export function reamostrarParaWhisper(
  canal: Float32Array,
  taxaOrigem: number,
): Float32Array {
  if (taxaOrigem === TAXA_WHISPER) return canal.slice();
  const razao = taxaOrigem / TAXA_WHISPER;
  const total = Math.floor(canal.length / razao);
  const saida = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const posicao = i * razao;
    const anterior = Math.floor(posicao);
    const proxima = Math.min(anterior + 1, canal.length - 1);
    const fracao = posicao - anterior;
    saida[i] = canal[anterior] * (1 - fracao) + canal[proxima] * fracao;
  }
  return saida;
}

/**
 * Junta um trecho transcrito ao fim do Conteúdo atual. O Whisper devolve
 * segmentos com espaços ao redor; o trecho entra aparado, separado por um
 * espaço quando o texto não termina em espaço ou quebra de linha.
 */
export function anexarTranscricao(atual: string, transcrito: string): string {
  const trecho = transcrito.trim();
  if (trecho === "") return atual;
  if (atual === "" || /\s$/.test(atual)) return atual + trecho;
  return `${atual} ${trecho}`;
}
