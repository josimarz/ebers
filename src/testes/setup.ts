import "@testing-library/jest-dom/vitest";

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
