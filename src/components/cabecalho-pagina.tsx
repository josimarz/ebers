import type { ReactNode } from "react";

interface PropsCabecalhoPagina {
  titulo: string;
  /** Uma linha de apoio: o que a página mostra, na linguagem do domínio. */
  descricao?: string;
  /** Ação principal da página, alinhada à direita (ex.: "Novo Paciente"). */
  acoes?: ReactNode;
}

/** Cabeçalho padrão das páginas (docs/design.md): título, apoio e ação. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: PropsCabecalhoPagina) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {titulo}
        </h1>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  );
}
