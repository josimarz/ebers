import { Badge } from "@/components/ui/badge";

/** Saldo de Créditos numa célula: zero apagado, positivo em destaque. */
export function SaldoCreditos({ saldo }: { saldo: number }) {
  if (saldo <= 0) {
    return <span className="text-muted-foreground">{saldo}</span>;
  }
  return <Badge variant="secondary">{saldo}</Badge>;
}
