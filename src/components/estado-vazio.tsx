import type { ComponentType } from "react";

interface PropsEstadoVazio {
  icone: ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
}

/** Estado vazio das listagens: cartão de vidro com ícone, título e apoio. */
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
}: PropsEstadoVazio) {
  return (
    <div className="glass-bg flex flex-col items-center gap-1.5 rounded-2xl px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mb-2 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <Icone className="size-6" />
      </span>
      <p className="font-medium">{titulo}</p>
      <p className="text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
