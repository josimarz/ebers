import type * as React from "react";

import { classesDoCampo } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Select nativo com o mesmo visual do Input. A aparência do motor é
 * desligada e a seta vem do CSS (`[data-slot="select-nativo"]` em index.css),
 * para o controle fechado parecer um campo do app em qualquer webview; a
 * lista aberta continua nativa.
 */
function SelectNativo({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select-nativo"
      className={cn(classesDoCampo, "pr-8 pl-2", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export { SelectNativo };
