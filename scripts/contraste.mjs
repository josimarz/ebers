// Valida o contraste WCAG da paleta (docs/design.md §4): lê os tokens OKLCH
// de src/index.css e mede cada cor de texto sobre cada superfície do app.
// Uso: npm run contraste  — sai com erro se algum par ficar abaixo da meta.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const raiz = css.slice(
  css.indexOf(":root {\n  --radius"),
  css.indexOf(".dark {"),
);

/** Tokens de uma linha só: `--nome: oklch(L C H)` ou `oklch(L C H / A%)`. */
function token(nome) {
  const m = raiz.match(
    new RegExp(
      `--${nome}: oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)(?: / ([\\d.]+)%)?\\)`,
    ),
  );
  if (!m) throw new Error(`token --${nome} não encontrado em :root`);
  return {
    cor: oklchParaRgb([+m[1], +m[2], +m[3]]),
    alfa: m[4] ? +m[4] / 100 : 1,
  };
}

function linearParaSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}
function srgbParaLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function oklchParaRgb([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, linearParaSrgb(v))));
}
function luminancia([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgbParaLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Compõe `topo` com alfa sobre `fundo`. */
function sobre(topo, alfa, fundo) {
  return topo.map((t, i) => t * alfa + fundo[i] * (1 - alfa));
}

const branco = [1, 1, 1];
// Superfícies, do mais escuro ao mais claro. A luz mais forte do pano é a
// primeira (azul da marca); o vidro é aproximado pelo alfa médio do gradiente.
const luz = raiz.match(
  /--pano-luz-1: radial-gradient\([^)]*?oklch\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)%\)/,
);
const panoComLuz = sobre(
  oklchParaRgb([+luz[1], +luz[2], +luz[3]]),
  +luz[4] / 100,
  token("pano").cor,
);
const superficies = {
  "pano + luz": panoComLuz,
  "cartão (glass-bg)": sobre(branco, 0.41, panoComLuz),
  "vidro fosco (glass-frosted)": sobre(branco, 0.72, panoComLuz),
};

/** [texto, superfície extra (tinta opaca do próprio estado), meta] */
const textos = [
  ["foreground", null, 4.5],
  ["muted-foreground", null, 4.5],
  ["primary", null, 4.5],
  ["accent-foreground", "accent", 4.5],
  ["success", "success-subtle", 4.5],
  ["warning", "warning-subtle", 4.5],
  ["destructive", "destructive-subtle", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["input", null, 3], // contorno de campo: componente de interface, não texto
];

let falhas = 0;
console.log("texto".padEnd(20), "superfície".padEnd(30), "razão", " meta");
for (const [nome, tinta, meta] of textos) {
  const cor = token(nome).cor;
  const casos = tinta ? { [`tinta ${tinta}`]: token(tinta).cor } : superficies;
  for (const [rotulo, fundo] of Object.entries(casos)) {
    // Primary como texto vale sobre cartão e vidro (menu ativo), não sobre o pano nu.
    if (nome === "primary" && rotulo === "pano + luz") continue;
    if (nome === "input" && rotulo === "pano + luz") continue;
    const razao = contraste(cor, fundo);
    const ok = razao >= meta;
    if (!ok) falhas++;
    console.log(
      nome.padEnd(20),
      rotulo.padEnd(30),
      razao.toFixed(2).padStart(5),
      ` ${meta}`,
      ok ? "" : "  ✗ ABAIXO DA META",
    );
  }
}
if (falhas > 0) {
  console.error(
    `\n${falhas} par(es) abaixo da meta — ajuste os tokens em src/index.css.`,
  );
  process.exit(1);
}
console.log("\nTodos os pares dentro da meta.");
