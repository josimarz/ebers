import { expect, test } from "vitest";
import { anexarTranscricao, reamostrarParaWhisper } from "./transcricao";

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
