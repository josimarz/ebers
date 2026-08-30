import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PropsPainelConsulta {
  /** O rótulo do campo — um `<label>` quando o corpo é um campo nativo. */
  titulo: ReactNode;
  descricao: string;
  /** Controle ao lado do título (ex.: o botão do microfone). */
  acao?: ReactNode;
  desabilitado?: boolean;
  children: ReactNode;
}

/**
 * Cartão de um dos textos da Consulta — Conteúdo e Notas (spec 2.3):
 * cabeçalho com título, apoio e um controle opcional; o corpo é o campo. O
 * anel de foco é do cartão inteiro, para o campo parecer o próprio vidro.
 */
export function PainelConsulta({
  titulo,
  descricao,
  acao,
  desabilitado = false,
  children,
}: PropsPainelConsulta) {
  return (
    <section
      className={cn(
        "glass-bg flex min-h-80 flex-col rounded-2xl focus-within:outline-2 focus-within:outline-ring/60",
        desabilitado && "opacity-80",
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border/60 px-5 pt-4 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-semibold">{titulo}</div>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}
