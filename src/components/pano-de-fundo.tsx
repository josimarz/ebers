/**
 * Pano de fundo do app (docs/design.md): base fria com três luzes suaves,
 * fixo atrás de tudo — é o que as superfícies de vidro desfocam. O mesmo nos
 * dois modos: o layout do desktop e o Auto-cadastro no tablet.
 */
export function PanoDeFundo() {
  return <div aria-hidden="true" className="pano-de-fundo" />;
}
