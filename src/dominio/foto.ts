/**
 * Converte os bytes de uma foto vindos do backend numa data URL exibível em
 * `<img>`. O backend normaliza toda foto para JPEG ao gravar
 * (src-tauri/src/fotos.rs), então o MIME aqui é fixo.
 */
export function dataUrlDeFoto(dados: Uint8Array): string {
  // btoa espera uma "binary string"; blocos evitam estourar a pilha do
  // String.fromCharCode(...bytes) com fotos maiores.
  const BLOCO = 8192;
  let binario = "";
  for (let inicio = 0; inicio < dados.length; inicio += BLOCO) {
    binario += String.fromCharCode(...dados.subarray(inicio, inicio + BLOCO));
  }
  return `data:image/jpeg;base64,${btoa(binario)}`;
}
