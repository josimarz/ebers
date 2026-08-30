import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Badge (docs/design.md): pílula de estado. Tinta clara + texto na cor do
 * estado — os tokens de estado têm luminosidade calibrada para ≥ 4,5:1
 * sobre a própria tinta. `default` usa o par accent/accent-foreground (azul).
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-accent-foreground/15 bg-accent text-accent-foreground",
        success: "border-success/20 bg-success-subtle text-success",
        warning: "border-warning/20 bg-warning-subtle text-warning",
        destructive:
          "border-destructive/20 bg-destructive-subtle text-destructive",
        secondary: "border-border/70 bg-glass-fill text-secondary-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
