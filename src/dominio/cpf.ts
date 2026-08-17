/**
 * Máscara progressiva de CPF, aplicada a cada tecla: mantém só os dígitos
 * (no máximo 11) e devolve o quanto de 000.000.000-00 já cabe neles. Os
 * separadores nunca sobram no fim ("529", não "529."), então apagar de trás
 * para frente sempre apaga um dígito.
 */
export function aplicarMascaraCpf(entrada: string): string {
  const digitos = entrada.replace(/\D/g, "").slice(0, 11);
  const grupos = [digitos.slice(0, 3), digitos.slice(3, 6), digitos.slice(6, 9)]
    .filter((grupo) => grupo !== "")
    .join(".");
  const verificadores = digitos.slice(9);
  return verificadores === "" ? grupos : `${grupos}-${verificadores}`;
}

/** Aplica a máscara 000.000.000-00 quando a entrada tem 11 dígitos. */
export function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11) return cpf;
  return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/** Valida os dígitos verificadores de um CPF, com ou sem máscara. */
export function validarCpf(cpf: string): boolean {
  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11) return false;
  // Sequências repetidas (111.111.111-11 etc.) passam na aritmética dos
  // verificadores, mas são CPFs inválidos por definição.
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const verificador = (quantidade: number): number => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) {
      soma += Number(digitos[i]) * (quantidade + 1 - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    verificador(9) === Number(digitos[9]) &&
    verificador(10) === Number(digitos[10])
  );
}
