// O jsdom é um navegador puro — para o app, Modo tablet. Estes helpers
// simulam o webview do app desktop, onde o Tauri injeta window.__TAURI__
// (src/lib/modo.ts). Encerrar em afterEach.

const janela = window as { __TAURI__?: unknown };

export function simularModoDesktop(): void {
  janela.__TAURI__ = {};
}

export function encerrarModoDesktop(): void {
  delete janela.__TAURI__;
}
