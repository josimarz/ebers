import { expect, test } from "vitest";
import {
  abrirProximaJanela,
  descartarJanela,
  janelaAberta,
  previaVazia,
  registrarTextoDaJanela,
  textoDaPrevia,
} from "./previa";

test("o que o microfone ouve na janela aberta é o texto da Prévia", () => {
  const previa = registrarTextoDaJanela(
    previaVazia(),
    1,
    "Essa semana foi difícil",
  );
  expect(textoDaPrevia(previa)).toBe("Essa semana foi difícil");
});

test("cada atualização da janela substitui o texto anterior dela", () => {
  let previa = registrarTextoDaJanela(previaVazia(), 1, "Essa semana fui");
  previa = registrarTextoDaJanela(previa, 1, "Essa semana foi difícil");
  expect(textoDaPrevia(previa)).toBe("Essa semana foi difícil");
});

test("a janela fechada segue congelada antes da aberta até ser descartada", () => {
  let previa = registrarTextoDaJanela(previaVazia(), 1, "Primeira frase.");
  previa = registrarTextoDaJanela(previa, 2, "Segunda");
  expect(textoDaPrevia(previa)).toBe("Primeira frase. Segunda");

  // A Transcrição da janela 1 entrou no Conteúdo.
  previa = descartarJanela(previa, 1);
  expect(textoDaPrevia(previa)).toBe("Segunda");
});

test("texto atrasado de uma janela já descartada não reaparece", () => {
  let previa = registrarTextoDaJanela(previaVazia(), 1, "Primeira frase.");
  previa = descartarJanela(previa, 1);
  previa = registrarTextoDaJanela(previa, 1, "Primeira frase, tarde.");
  expect(textoDaPrevia(previa)).toBe("");
});

test("sem nada ouvido, a Prévia é vazia", () => {
  expect(textoDaPrevia(previaVazia())).toBe("");
  expect(textoDaPrevia(registrarTextoDaJanela(previaVazia(), 1, "  "))).toBe(
    "",
  );
});

test("a Prévia começa na janela 1 e cada fechamento abre a seguinte", () => {
  const previa = previaVazia();
  expect(janelaAberta(previa)).toBe(1);
  expect(janelaAberta(abrirProximaJanela(previa))).toBe(2);
  expect(janelaAberta(abrirProximaJanela(abrirProximaJanela(previa)))).toBe(3);
});

test("abrir a próxima janela não mexe no que as anteriores ouviram", () => {
  let previa = registrarTextoDaJanela(previaVazia(), 1, "Primeira frase.");
  previa = abrirProximaJanela(previa);
  previa = registrarTextoDaJanela(previa, janelaAberta(previa), "Segunda");
  expect(textoDaPrevia(previa)).toBe("Primeira frase. Segunda");
});
