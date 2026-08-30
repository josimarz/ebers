import { Badge } from "@/components/ui/badge";
import type { StatusConsulta as Status } from "@/dominio/consulta";

const VARIANTE_POR_STATUS = {
  Aberta: "default",
  Finalizada: "success",
  Cancelada: "secondary",
} as const;

/**
 * Status da Consulta como badge: Aberta na cor de ação (em andamento),
 * Finalizada em verde, Cancelada neutra. Só o texto, para leitores de tela e
 * para as listagens lerem o mesmo que a página.
 */
export function StatusConsulta({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTE_POR_STATUS[status]} className={className}>
      {status}
    </Badge>
  );
}
