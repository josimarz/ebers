import { expect, test } from "vitest";
import { dataUrlDeFoto } from "./foto";

test("bytes da foto viram data URL de JPEG em base64", () => {
  // [255, 216, 255] é o início típico de um JPEG; em base64, "/9j/".
  const dados = new Uint8Array([0xff, 0xd8, 0xff]);

  expect(dataUrlDeFoto(dados)).toBe("data:image/jpeg;base64,/9j/");
});

test("fotos grandes são codificadas por inteiro, sem perder bytes", () => {
  // Bem maior que o bloco de conversão, para exercitar a codificação em blocos.
  const dados = new Uint8Array(100_000).map((_, indice) => indice % 256);

  const dataUrl = dataUrlDeFoto(dados);

  const prefixo = "data:image/jpeg;base64,";
  expect(dataUrl.startsWith(prefixo)).toBe(true);
  const decodificado = atob(dataUrl.slice(prefixo.length));
  expect(decodificado).toHaveLength(100_000);
  const intacto = [...decodificado].every(
    (caractere, indice) => caractere.charCodeAt(0) === indice % 256,
  );
  expect(intacto).toBe(true);
});
