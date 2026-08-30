import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PropsAvisoErro {
  children: ReactNode;
  className?: string;
}

/**
 * Erro em bloco — falha de carga ou de uma ação da página. `role="alert"`
 * para o leitor de tela anunciar quando aparece.
 */
export function AvisoErro({ children, className }: PropsAvisoErro) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive-subtle px-4 py-3 text-sm text-destructive",
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
