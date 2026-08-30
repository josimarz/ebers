import type * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Campo sobre vidro (docs/design.md): preenchimento leve para o campo se
 * destacar do cartão, contorno a 3:1 e, em foco, o anel da cor de ação.
 * Compartilhado com o SelectNativo — por isso sem `read-only:` aqui:
 * `:read-only` casa com todo `<select>`, que nunca é `:read-write`.
 */
const classesDoCampo =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-glass-fill px-2.5 py-1 text-base transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/*
 * Somente leitura é o estado "não se aplica agora" dos formulários: o campo
 * fica na tela, com contorno, fundo e texto apagados.
 */
const classesDeSomenteLeitura =
  "read-only:border-border read-only:bg-muted/40 read-only:text-muted-foreground read-only:hover:border-border dark:read-only:bg-input/80";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        classesDoCampo,
        classesDeSomenteLeitura,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { classesDoCampo, Input };
