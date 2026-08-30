import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// A Testing Library só avança timers falsos se enxergar o global `jest`
// (jestFakeTimersAreEnabled); no vitest ele não existe e o dreno interno de
// user-event/waitFor fica preso num setTimeout mockado que nunca dispara.
// O shim entrega o único método que ela chama.
(globalThis as { jest?: unknown }).jest = {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};

// Shims de APIs de navegador ausentes no jsdom, exigidas pelos componentes
// (sidebar usa matchMedia; componentes Radix usam ResizeObserver).
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!("ResizeObserver" in window)) {
  class ResizeObserverShim {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverShim;
}

// O ProseMirror (editor de Notas) mede a posição da seleção para rolá-la até
// a tela; o jsdom não implementa as APIs de layout que ele consulta.
function retanguloVazio(): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
}
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = retanguloVazio;
}
if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () =>
    [retanguloVazio()] as unknown as DOMRectList;
}
if (!Document.prototype.elementFromPoint) {
  Document.prototype.elementFromPoint = () => null;
}
