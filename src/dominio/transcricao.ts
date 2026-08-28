/**
 * Transcrição de voz da Consulta (spec 2.3 e 5.3, ADR-0004): o que o
 * microfone capta vira texto no Conteúdo. Aqui vive a parte pura do fluxo —
 * juntar transcrição ao texto existente.
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

/** RMS abaixo do qual um bloco captado conta como silêncio (~-40 dBFS). */
const LIMIAR_SILENCIO_RMS = 0.01;

/**
 * Fala acumulada mínima antes de uma pausa poder fechar o trecho.
 *
 * Trecho curto custa precisão: o Whisper decodifica cada um sozinho, sem nada
 * do que veio antes, e toda costura é uma chance de errar a emenda. Medido
 * sobre 100 s de ditado real (210 palavras de referência), em erros de
 * palavra: com 2 s eram 29 trechos e 33 erros; com 12 s são 8 trechos e 22
 * erros — o mesmo resultado de transcrever a gravação inteira de uma vez.
 *
 * O preço é a espera: o texto aparece a cada ~12 s em vez de ~3,5 s.
 *
 * Tem de ficar **abaixo** de TRECHO_MAXIMO_S com folga. Se alcançá-lo, a
 * pausa nunca chega a fechar trecho nenhum e todo corte passa a cair no teto,
 * no meio da palavra — nessa mesma gravação o erro saltou para 59 palavras.
 */
const TRECHO_MINIMO_S = 12;
/** Pausa de fala que fecha o trecho — a deixa natural do ditado. */
const PAUSA_PARA_FECHAR_S = 0.6;
/** Fala contínua nunca segura um trecho além disto. */
const TRECHO_MAXIMO_S = 28;

function ehSilencio(bloco: Float32Array): boolean {
  let soma = 0;
  for (const amostra of bloco) soma += amostra * amostra;
  return Math.sqrt(soma / bloco.length) < LIMIAR_SILENCIO_RMS;
}

/**
 * Fim de uma janela do acumulador: o trecho a transcrever, ou nulo quando
 * ninguém falou nela. A janela vazia ainda é sinalizada porque a Prévia
 * (ADR-0007) recomeça o reconhecedor a cada janela — um request nunca vive
 * além de um trecho, com fala ou sem.
 */
export interface JanelaFechada {
  trecho: Float32Array | null;
}

/**
 * Junta os blocos captados do microfone em trechos prontos para transcrever.
 * Blocos entram na taxa nativa da captura; o trecho emitido já sai na taxa do
 * Whisper. Janelas onde ninguém falou fecham sem trecho — silêncio
 * transcrito é alucinação do Whisper.
 */
export class AcumuladorDeAudio {
  private blocos: Float32Array[] = [];
  private totalAmostras = 0;
  private silencioFinalAmostras = 0;
  private houveFala = false;

  constructor(private readonly taxaOrigem: number) {}

  /** Recebe um bloco captado; devolve a janela fechada, se este bloco a fechou. */
  registrar(bloco: Float32Array): JanelaFechada | null {
    this.blocos.push(bloco.slice());
    this.totalAmostras += bloco.length;
    if (ehSilencio(bloco)) {
      this.silencioFinalAmostras += bloco.length;
    } else {
      this.silencioFinalAmostras = 0;
      this.houveFala = true;
    }
    const pausaFechou =
      this.totalAmostras >= TRECHO_MINIMO_S * this.taxaOrigem &&
      this.silencioFinalAmostras >= PAUSA_PARA_FECHAR_S * this.taxaOrigem;
    const estourouMaximo =
      this.totalAmostras >= TRECHO_MAXIMO_S * this.taxaOrigem;
    return pausaFechou || estourouMaximo ? { trecho: this.cortar() } : null;
  }

  /** O que restou ao desligar o microfone (nulo se ninguém falou). */
  descarregar(): Float32Array | null {
    return this.cortar();
  }

  /** Fecha a janela atual e recomeça; devolve o trecho se houve fala nela. */
  private cortar(): Float32Array | null {
    const blocos = this.blocos;
    const totalAmostras = this.totalAmostras;
    const comFala = this.houveFala;
    this.blocos = [];
    this.totalAmostras = 0;
    this.silencioFinalAmostras = 0;
    this.houveFala = false;
    if (!comFala) return null;

    const janela = new Float32Array(totalAmostras);
    let posicao = 0;
    for (const bloco of blocos) {
      janela.set(bloco, posicao);
      posicao += bloco.length;
    }
    return reamostrarParaWhisper(janela, this.taxaOrigem);
  }
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
