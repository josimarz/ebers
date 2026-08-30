/** Data de hoje no fuso local, em ISO (AAAA-MM-DD). */
export function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Idade completada na data de referência, ambas em ISO (AAAA-MM-DD).
 * Compara os componentes da data diretamente para não sofrer o deslocamento
 * de fuso de `new Date("AAAA-MM-DD")` (interpretado como UTC).
 */
export function calcularIdade(
  dataNascimento: string,
  dataReferencia: string,
): number {
  const [anoN, mesN, diaN] = dataNascimento.split("-").map(Number);
  const [anoR, mesR, diaR] = dataReferencia.split("-").map(Number);

  const aniversarioAindaNaoChegou =
    mesR < mesN || (mesR === mesN && diaR < diaN);
  return anoR - anoN - (aniversarioAindaNaoChegou ? 1 : 0);
}
