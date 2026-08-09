import { expect, test } from "vitest";
import {
  AcumuladorDeAudio,
  anexarTranscricao,
  reamostrarParaWhisper,
} from "./transcricao";

/** Bloco captado de `duracaoS` segundos com todas as amostras em `amplitude`. */
function bloco(duracaoS: number, amplitude: number, taxa: number) {
  return new Float32Array(duracaoS * taxa).fill(amplitude);
}

/** Alimenta o acumulador com blocos de 0,5 s e devolve os trechos emitidos. */
function alimentar(
  acumulador: AcumuladorDeAudio,
  taxa: number,
  amplitudes: number[],
) {
  return amplitudes
    .map((amplitude) => acumulador.registrar(bloco(0.5, amplitude, taxa)))
    .filter((trecho) => trecho !== null);
}

test("a transcrição entra no fim do Conteúdo, separada por espaço", () => {
  expect(anexarTranscricao("Relato até aqui.", "Segue ansiosa.")).toBe(
    "Relato até aqui. Segue ansiosa.",
  );
});

test("num Conteúdo vazio, a transcrição entra sem separador", () => {
  expect(anexarTranscricao("", "Primeira frase.")).toBe("Primeira frase.");
});

test("a transcrição chega com espaços do Whisper e entra aparada", () => {
  expect(anexarTranscricao("Relato.", "  Segue tensa. ")).toBe(
    "Relato. Segue tensa.",
  );
});

test("transcrição vazia (ou só espaços) não altera o Conteúdo", () => {
  expect(anexarTranscricao("Relato.", "")).toBe("Relato.");
  expect(anexarTranscricao("Relato.", "   ")).toBe("Relato.");
});

test("Conteúdo terminado em quebra de linha não ganha espaço a mais", () => {
  expect(anexarTranscricao("Tópicos:\n", "Sono ruim.")).toBe(
    "Tópicos:\nSono ruim.",
  );
});

test("áudio a 32 kHz é reamostrado a 16 kHz tomando uma amostra a cada duas", () => {
  const canal = new Float32Array([0, 1, 2, 3]);
  expect(Array.from(reamostrarParaWhisper(canal, 32000))).toEqual([0, 2]);
});

test("áudio a 48 kHz cai para um terço das amostras", () => {
  const canal = new Float32Array([0, 0.25, 0.5, 0.75, 1, 1.25]);
  expect(Array.from(reamostrarParaWhisper(canal, 48000))).toEqual([0, 0.75]);
});

test("taxa fracionária interpola entre as amostras vizinhas", () => {
  const canal = new Float32Array([0, 1, 2]);
  expect(Array.from(reamostrarParaWhisper(canal, 24000))).toEqual([0, 1.5]);
});

test("áudio já a 16 kHz sai como entrou", () => {
  const canal = new Float32Array([0.5, -0.25, 1]);
  expect(Array.from(reamostrarParaWhisper(canal, 16000))).toEqual([
    0.5, -0.25, 1,
  ]);
});

test("a pausa depois da fala fecha o trecho, com a fala preservada", () => {
  const acumulador = new AcumuladorDeAudio(16000);

  // 2 s de fala: nada emitido ainda.
  expect(alimentar(acumulador, 16000, [0.25, 0.25, 0.25, 0.25])).toEqual([]);
  // 0,5 s de pausa ainda não fecha o trecho…
  expect(acumulador.registrar(bloco(0.5, 0, 16000))).toBeNull();
  // …1 s de pausa fecha: 3 s de áudio, fala na frente, pausa no fim.
  const trecho = acumulador.registrar(bloco(0.5, 0, 16000));

  expect(trecho).not.toBeNull();
  expect(trecho).toHaveLength(3 * 16000);
  expect(trecho?.[0]).toBe(0.25);
  expect(trecho?.[3 * 16000 - 1]).toBe(0);

  // A janela recomeça vazia: silêncio novo não emite nada.
  expect(acumulador.registrar(bloco(0.5, 0, 16000))).toBeNull();
});

test("fala contínua sem pausa é cortada na duração máxima", () => {
  const acumulador = new AcumuladorDeAudio(16000);

  // 9,5 s de fala ininterrupta: nada emitido…
  expect(alimentar(acumulador, 16000, Array(19).fill(0.25))).toEqual([]);
  // …no bloco que completa 10 s, o trecho sai inteiro.
  const trecho = acumulador.registrar(bloco(0.5, 0.25, 16000));

  expect(trecho).toHaveLength(10 * 16000);
  expect(trecho?.[0]).toBe(0.25);
});

test("silêncio, por mais longo que seja, nunca vira trecho a transcrever", () => {
  const acumulador = new AcumuladorDeAudio(16000);

  // 12 s de silêncio: passa pelos pontos de decisão da pausa e do máximo.
  const trechos = alimentar(acumulador, 16000, Array(24).fill(0));

  expect(trechos).toEqual([]);
  expect(acumulador.descarregar()).toBeNull();
});

test("ruído baixo de fundo conta como silêncio, não como fala", () => {
  const acumulador = new AcumuladorDeAudio(16000);

  const trechos = alimentar(acumulador, 16000, Array(24).fill(0.005));

  expect(trechos).toEqual([]);
  expect(acumulador.descarregar()).toBeNull();
});

test("captura a 48 kHz sai no trecho já na taxa do Whisper", () => {
  const acumulador = new AcumuladorDeAudio(48000);

  expect(alimentar(acumulador, 48000, [0.25, 0.25, 0.25, 0.25])).toEqual([]);
  const trecho = acumulador.registrar(bloco(1, 0, 48000));

  // 3 s de áudio captado → 3 s × 16000 amostras.
  expect(trecho).toHaveLength(3 * 16000);
  expect(trecho?.[0]).toBe(0.25);
});

test("desligar o microfone descarrega a fala que ainda não fechou trecho", () => {
  const acumulador = new AcumuladorDeAudio(16000);

  // 1 s de fala: abaixo do mínimo, nada emitido.
  expect(alimentar(acumulador, 16000, [0.25, 0.25])).toEqual([]);

  const resto = acumulador.descarregar();
  expect(resto).toHaveLength(16000);
  expect(resto?.[0]).toBe(0.25);

  // Depois de descarregar, não há mais nada pendente.
  expect(acumulador.descarregar()).toBeNull();
});
