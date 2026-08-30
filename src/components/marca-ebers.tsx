import { cn } from "@/lib/utils";

interface PropsMarcaEbers {
  /** Classes extras do nome — o menu lateral o esconde quando recolhido. */
  classeDoNome?: string;
}

/** A marca: monograma sobre a cor de ação e o nome do app. */
export function MarcaEbers({ classeDoNome }: PropsMarcaEbers) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/30%),0_1px_2px_0_oklch(0.25_0.03_295/16%)]"
      >
        E
      </span>
      <span
        className={cn(
          "font-heading text-base font-bold tracking-tight",
          classeDoNome,
        )}
      >
        Ebers
      </span>
    </div>
  );
}
