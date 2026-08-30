import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AvisoErro } from "@/components/aviso";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltroPaciente } from "@/components/filtro-paciente";
import { FotoPaciente } from "@/components/foto-paciente";
import { ModalCreditos } from "@/components/modal-creditos";
import { SaldoCreditos } from "@/components/saldo-creditos";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Consulta, listarConsultas } from "@/db/consultas";
import { saldosDeCreditos } from "@/db/creditos";
import { listarPacientes, type Paciente } from "@/db/pacientes";
import { montarLinhasFinanceiras } from "@/dominio/financeiro";

type Carga =
  | { estado: "carregando" }
  | {
      estado: "pronto";
      pacientes: Paciente[];
      consultas: Consulta[];
      saldos: Map<number, number>;
    }
  | { estado: "erro" };

export function PaginaFinanceiro() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [pacienteDoModal, setPacienteDoModal] = useState<Paciente | null>(null);

  // O modal avisa o novo saldo após Venda/Ajuste — a coluna Créditos
  // acompanha sem reler o banco.
  function atualizarSaldo(idDoPaciente: number, saldo: number) {
    setCarga((atual) => {
      if (atual.estado !== "pronto") return atual;
      const saldos = new Map(atual.saldos);
      saldos.set(idDoPaciente, saldo);
      return { ...atual, saldos };
    });
  }

  useEffect(() => {
    let ativo = true;
    Promise.all([listarPacientes(), listarConsultas(), saldosDeCreditos()])
      .then(([pacientes, consultas, saldos]) => {
        if (ativo) setCarga({ estado: "pronto", pacientes, consultas, saldos });
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
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Consultas feitas e pagas, Créditos e pendências de cada paciente."
      />

      {carga.estado === "carregando" && (
        <p className="text-sm text-muted-foreground">Carregando pacientes…</p>
      )}

      {carga.estado === "erro" && (
        <AvisoErro>Não foi possível carregar o controle financeiro.</AvisoErro>
      )}

      {carga.estado === "pronto" &&
        (carga.pacientes.length === 0 ? (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum paciente cadastrado"
            descricao="Os pacientes cadastrados aparecerão aqui."
          />
        ) : (
          <TabelaFinanceira
            pacientes={carga.pacientes}
            consultas={carga.consultas}
            saldos={carga.saldos}
            pacienteId={pacienteId}
            aoFiltrar={setPacienteId}
            aoAbrirCreditos={setPacienteDoModal}
          />
        ))}

      {pacienteDoModal !== null && (
        <ModalCreditos
          paciente={pacienteDoModal}
          aoFechar={() => setPacienteDoModal(null)}
          aoMudarSaldo={(saldo) => atualizarSaldo(pacienteDoModal.id, saldo)}
        />
      )}
    </section>
  );
}

interface PropsTabelaFinanceira {
  pacientes: Paciente[];
  consultas: Consulta[];
  saldos: Map<number, number>;
  pacienteId: number | null;
  aoFiltrar: (pacienteId: number | null) => void;
  aoAbrirCreditos: (paciente: Paciente) => void;
}

function TabelaFinanceira({
  pacientes,
  consultas,
  saldos,
  pacienteId,
  aoFiltrar,
  aoAbrirCreditos,
}: PropsTabelaFinanceira) {
  const linhas = montarLinhasFinanceiras(
    pacientes,
    consultas,
    saldos,
    pacienteId,
  );

  return (
    <div className="flex flex-col gap-4">
      <FiltroPaciente
        pacientes={pacientes}
        selecionado={pacienteId}
        aoSelecionar={aoFiltrar}
      />

      <div className="glass-bg overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="sr-only">Foto</span>
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Consultas feitas</TableHead>
              <TableHead>Consultas pagas</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ paciente, feitas, pagas, creditos, pendencia }) => (
              <TableRow
                key={paciente.id}
                className={
                  // Pendência financeira (spec 3.1): pagas < feitas
                  // destaca a linha em vermelho.
                  pendencia
                    ? "bg-destructive/10 hover:bg-destructive/15"
                    : undefined
                }
              >
                <TableCell className="w-14 pr-0">
                  <FotoPaciente
                    arquivo={paciente.foto}
                    nome={paciente.nomeCompleto}
                    className="size-8"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {paciente.nomeCompleto}
                </TableCell>
                <TableCell>{feitas}</TableCell>
                <TableCell>{pagas}</TableCell>
                <TableCell>
                  <SaldoCreditos saldo={creditos} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/consultas?paciente=${paciente.id}`}>
                        Listar consultas
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/pacientes/${paciente.id}/editar`}>
                        Acessar cadastro
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => aoAbrirCreditos(paciente)}
                    >
                      Créditos
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
