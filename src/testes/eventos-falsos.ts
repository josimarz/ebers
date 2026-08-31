// Dublê do @tauri-apps/api/event com ouvintes inspecionáveis, para vi.mock:
//   vi.mock("@tauri-apps/api/event", () => import("@/testes/eventos-falsos"));
// Guarda os ouvintes registrados e deixa o teste emitir eventos como o
// backend Rust emitiria. Reiniciar em beforeEach.

type Ouvinte = () => void;

const ouvintes = new Map<string, Set<Ouvinte>>();

export function reiniciarEventosFalsos(): void {
  ouvintes.clear();
}

/** Quantos ouvintes o evento tem agora — confere a limpeza no desmontar. */
export function totalDeOuvintes(evento: string): number {
  return ouvintes.get(evento)?.size ?? 0;
}

/** Dispara o evento para os ouvintes, como o backend Rust ao emitir. */
export function emitirEventoFalso(evento: string): void {
  for (const ouvinte of ouvintes.get(evento) ?? []) ouvinte();
}

export async function listen(
  evento: string,
  ouvinte: Ouvinte,
): Promise<() => void> {
  const conjunto = ouvintes.get(evento) ?? new Set();
  conjunto.add(ouvinte);
  ouvintes.set(evento, conjunto);
  return () => {
    conjunto.delete(ouvinte);
  };
}
