import type * as React from "react";

import { cn } from "@/lib/utils";
import { classesDeSomenteLeitura, classesDoCampo } from "./input";

/*
 * Campo multilinha sobre vidro (docs/design.md 3.4): as classes do Input,
 * trocando a altura fixa de uma linha por uma altura mínima que a pessoa
 * pode esticar. Somente leitura se comporta como no Input.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        classesDoCampo,
        classesDeSomenteLeitura,
        "h-auto min-h-28 resize-y py-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
