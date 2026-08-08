import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { listarPacientes, type Paciente } from "@/db/pacientes";

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; pacientes: Paciente[] }
  | { estado: "erro" };

export function PaginaPacientes() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });

  useEffect(() => {
    let ativo = true;
    listarPacientes()
      .then((pacientes) => {
        if (ativo) setCarga({ estado: "pronto", pacientes });
      })
      .catch(() => {
        if (ativo) setCarga({ estado: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Pacientes</h1>
        <Button asChild>
          <Link to="/pacientes/novo">Novo Paciente</Link>
        </Button>
      </div>

      {carga.estado === "carregando" && (
        <p className="text-muted-foreground">Carregando pacientes…</p>
      )}

      {carga.estado === "erro" && (
        <p className="text-destructive">
          Não foi possível carregar os pacientes.
        </p>
      )}

      {carga.estado === "pronto" &&
        (carga.pacientes.length === 0 ? (
          <div className="glass-bg flex flex-col items-center gap-1 rounded-xl px-6 py-12 text-center">
            <p className="font-medium">Nenhum paciente cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Os pacientes cadastrados aparecerão aqui.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {carga.pacientes.map((paciente) => (
              <li
                key={paciente.id}
                className="glass-bg flex items-center justify-between gap-4 rounded-lg px-4 py-3"
              >
                <span>{paciente.nomeCompleto}</span>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/pacientes/${paciente.id}/editar`}>Editar</Link>
                </Button>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
