/**
 * Prévia da transcrição (spec 2.3, ADR-0007): o que o microfone está ouvindo
 * agora, em texto provisório. O reconhecedor trabalha em janelas — uma por
 * trecho que o Whisper vai transcrever —, e cada janela tem o seu texto
 * atualizado enquanto está aberta. Uma janela fechada fica congelada na
 * Prévia até a Transcrição dela entrar no Conteúdo, quando é descartada.
 */

interface Janela {
  numero: number;
  texto: string;
}

export interface Previa {
  /** Janelas ainda exibidas, na ordem em que foram abertas. */
  readonly janelas: readonly Janela[];
  /**
   * Maior janela já descartada. As janelas são numeradas em ordem crescente,
   * então um texto que chegue atrasado para uma delas é ignorado — a
   * Transcrição já entrou no Conteúdo e a Prévia não pode reaparecer.
   */
  readonly ultimaDescartada: number;
  /**
   * Janela em que o reconhecedor está ouvindo agora. O backend numera do
   * mesmo jeito (a partir de 1, uma a mais a cada fechamento), então basta
   * manter a contagem em sincronia.
   */
  readonly janelaAberta: number;
}

export function previaVazia(): Previa {
  return { janelas: [], ultimaDescartada: 0, janelaAberta: 1 };
}

export function janelaAberta(previa: Previa): number {
  return previa.janelaAberta;
}

/** A janela aberta fechou (o trecho dela vai ao Whisper): a seguinte abre. */
export function abrirProximaJanela(previa: Previa): Previa {
  return { ...previa, janelaAberta: previa.janelaAberta + 1 };
}

/** Registra o texto mais recente ouvido numa janela (nova ou já exibida). */
export function registrarTextoDaJanela(
  previa: Previa,
  numero: number,
  texto: string,
): Previa {
  if (numero <= previa.ultimaDescartada) return previa;
  const existente = previa.janelas.some((janela) => janela.numero === numero);
  const janelas = existente
    ? previa.janelas.map((janela) =>
        janela.numero === numero ? { numero, texto } : janela,
      )
    : [...previa.janelas, { numero, texto }];
  return { ...previa, janelas };
}

/** A Transcrição da janela entrou no Conteúdo: a Prévia dela some. */
export function descartarJanela(previa: Previa, numero: number): Previa {
  return {
    ...previa,
    janelas: previa.janelas.filter((janela) => janela.numero !== numero),
    ultimaDescartada: Math.max(previa.ultimaDescartada, numero),
  };
}

/** O texto exibido: janelas congeladas e a aberta, na ordem da fala. */
export function textoDaPrevia(previa: Previa): string {
  return previa.janelas
    .map((janela) => janela.texto.trim())
    .filter((texto) => texto !== "")
    .join(" ");
}
