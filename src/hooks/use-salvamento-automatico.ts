import { useCallback, useEffect, useRef } from "react";

/** Pausa de digitação que dispara o salvamento automático. */
const ATRASO_SALVAMENTO_MS = 600;
/** Digitação (ou transcrição) contínua nunca espera mais que isto. */
const ESPERA_MAXIMA_SALVAMENTO_MS = 2000;

interface Pendente {
  texto: string;
  desdeMs: number;
  temporizador?: ReturnType<typeof setTimeout>;
}

/**
 * Salvamento automático dos textos da Consulta (spec 2.3): sem botão
 * "Salvar", cada texto registrado é persistido na pausa da digitação — e, sob
 * digitação contínua, no máximo a cada ESPERA_MAXIMA_SALVAMENTO_MS. Devolve o
 * `registrar` a chamar com o texto inteiro a cada alteração.
 *
 * Sair da página no meio da pausa (ex.: navegar pela sidebar) não pode
 * descartar o que ainda não foi gravado: o desmonte faz o flush imediato.
 */
export function useSalvamentoAutomatico(
  aoSalvar: (texto: string) => Promise<void>,
): (texto: string) => void {
  const pendente = useRef<Pendente | null>(null);
  const aoSalvarAtual = useRef(aoSalvar);
  aoSalvarAtual.current = aoSalvar;

  const persistir = useCallback(() => {
    if (pendente.current === null) return;
    const { texto, temporizador } = pendente.current;
    clearTimeout(temporizador);
    pendente.current = null;
    aoSalvarAtual.current(texto).catch(() => {
      // Falha de gravação: o texto volta a pendente, e a próxima alteração
      // (ou o desmonte) dispara nova tentativa.
      pendente.current ??= { texto, desdeMs: Date.now() };
    });
  }, []);

  useEffect(() => () => persistir(), [persistir]);

  return useCallback(
    (texto: string) => {
      const desdeMs = pendente.current?.desdeMs ?? Date.now();
      if (pendente.current !== null) {
        clearTimeout(pendente.current.temporizador);
      }
      const prazoMaximo = desdeMs + ESPERA_MAXIMA_SALVAMENTO_MS - Date.now();
      const espera = Math.max(0, Math.min(ATRASO_SALVAMENTO_MS, prazoMaximo));
      pendente.current = {
        texto,
        desdeMs,
        temporizador: setTimeout(persistir, espera),
      };
    },
    [persistir],
  );
}
