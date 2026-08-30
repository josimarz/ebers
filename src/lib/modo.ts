/**
 * Detecção do contexto de execução (spec 5.1): dentro do app desktop o Tauri
 * injeta `window.__TAURI__` (`app.withGlobalTauri` em tauri.conf.json); num
 * navegador da rede local ele não existe e a SPA entra no Modo tablet,
 * restrito ao Auto-cadastro. Consequência aceita (ADR-0003): qualquer
 * navegador externo cai no Modo tablet.
 */
export function modoTablet(): boolean {
  return !("__TAURI__" in window);
}
