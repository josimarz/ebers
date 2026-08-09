import { afterEach, expect, test } from "vitest";
import { encerrarModoDesktop, simularModoDesktop } from "@/testes/modo-desktop";
import { modoTablet } from "./modo";

afterEach(() => {
  encerrarModoDesktop();
});

test("navegador sem window.__TAURI__ está no Modo tablet", () => {
  expect(modoTablet()).toBe(true);
});

test("webview do app desktop (window.__TAURI__ presente) não está no Modo tablet", () => {
  simularModoDesktop();
  expect(modoTablet()).toBe(false);
});
