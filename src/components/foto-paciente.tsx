import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { carregarFoto } from "@/db/fotos";
import { dataUrlDeFoto } from "@/dominio/foto";
import { cn } from "@/lib/utils";

interface PropsFotoPaciente {
  /** Nome do arquivo no diretório de fotos do backend; null = sem foto. */
  arquivo: string | null;
  nome: string;
  className?: string;
}

/**
 * Foto de perfil redonda do Paciente (spec 1.2), carregada do backend pelo
 * nome do arquivo. Sem foto — ou enquanto carrega, ou falhando a leitura —
 * fica o avatar neutro.
 */
export function FotoPaciente({ arquivo, nome, className }: PropsFotoPaciente) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    if (arquivo === null) return;
    let ativo = true;
    carregarFoto(arquivo)
      .then((bytes) => {
        if (ativo) setSrc(dataUrlDeFoto(bytes));
      })
      .catch(() => {
        // Arquivo ausente ou ilegível: o avatar neutro já está na tela.
      });
    return () => {
      ativo = false;
    };
  }, [arquivo]);

  if (src === null) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-glass-border",
          className,
        )}
      >
        <User className="size-1/2" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`Foto de ${nome}`}
      className={cn(
        "rounded-full object-cover ring-1 ring-glass-border",
        className,
      )}
    />
  );
}
