import { ArrowDown, ArrowUp, NotebookPen, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AvisoErro } from "@/components/aviso";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FiltroPaciente } from "@/components/filtro-paciente";
import { FotoPaciente } from "@/components/foto-paciente";
import { StatusConsulta } from "@/components/status-consulta";
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
import { listarPacientes, type Paciente } from "@/db/pacientes";
import { formatarData, formatarHora } from "@/dominio/data-hora";
import {
  montarPaginaDeConsultas,
  type ParametrosListagemConsultas,
} from "@/dominio/listagem-consultas";

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; consultas: Consulta[]; pacientes: Paciente[] }
  | { estado: "erro" };

/** Id vindo de ?paciente= — o atalho "Listar consultas" do Controle
 * financeiro (spec 3.1) abre a listagem já filtrada. Inválido = sem filtro. */
function pacienteDaUrl(parametro: string | null): number | null {
  const id = Number(parametro);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function PaginaConsultas() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [buscaUrl] = useSearchParams();
  const [parametros, setParametros] = useState<ParametrosListagemConsultas>(
    () => ({
      pacienteId: pacienteDaUrl(buscaUrl.get("paciente")),
      direcao: "desc",
      pagina: 1,
    }),
  );
  const navegar = useNavigate();

  useEffect(() => {
    let ativo = true;
    Promise.all([listarConsultas(), listarPacientes()])
      .then(([consultas, pacientes]) => {
        if (ativo) setCarga({ estado: "pronto", consultas, pacientes });
      })
      .catch(() => {
        if (ativo) setCarga({ estado: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Ordenar e filtrar recomeçam da primeira página; só navegar a preserva.
  function alternarDirecao() {
    setParametros((atual) => ({
      ...atual,
      direcao: atual.direcao === "desc" ? "asc" : "desc",
      pagina: 1,
    }));
  }

  function filtrarPorPaciente(pacienteId: number | null) {
    setParametros((atual) => ({ ...atual, pacienteId, pagina: 1 }));
  }

  function irParaPagina(pagina: number) {
    setParametros((atual) => ({ ...atual, pagina }));
  }

  return (
    <section className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo="Consultas"
        descricao="Todas as Consultas registradas, com filtro por paciente."
      />

      {carga.estado === "carregando" && (
        <p className="text-sm text-muted-foreground">Carregando consultas…</p>
      )}

      {carga.estado === "erro" && (
        <AvisoErro>Não foi possível carregar as consultas.</AvisoErro>
      )}

      {carga.estado === "pronto" &&
        (carga.consultas.length === 0 ? (
          <EstadoVazio
            icone={NotebookPen}
            titulo="Nenhuma consulta registrada"
            descricao="As consultas criadas aparecerão aqui."
          />
        ) : (
          <TabelaDeConsultas
            consultas={carga.consultas}
            pacientes={carga.pacientes}
            parametros={parametros}
            aoAlternarDirecao={alternarDirecao}
            aoFiltrar={filtrarPorPaciente}
            aoMudarPagina={irParaPagina}
            aoAbrirConsulta={(id) => navegar(`/consultas/${id}`)}
          />
        ))}
    </section>
  );
}

interface PropsTabelaDeConsultas {
  consultas: Consulta[];
  pacientes: Paciente[];
  parametros: ParametrosListagemConsultas;
  aoAlternarDirecao: () => void;
  aoFiltrar: (pacienteId: number | null) => void;
  aoMudarPagina: (pagina: number) => void;
  aoAbrirConsulta: (id: number) => void;
}

function TabelaDeConsultas({
  consultas,
  pacientes,
  parametros,
  aoAlternarDirecao,
  aoFiltrar,
  aoMudarPagina,
  aoAbrirConsulta,
}: PropsTabelaDeConsultas) {
  const { itens, pagina, totalPaginas } = montarPaginaDeConsultas(
    consultas,
    parametros,
  );
  const pacientesPorId = new Map(
    pacientes.map((paciente) => [paciente.id, paciente]),
  );

  return (
    <div className="flex flex-col gap-4">
      <FiltroPaciente
        pacientes={pacientes}
        selecionado={parametros.pacienteId}
        aoSelecionar={aoFiltrar}
      />

      {itens.length === 0 ? (
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhuma consulta encontrada"
          descricao="O paciente selecionado não tem consultas registradas."
        />
      ) : (
        <>
          <div className="glass-bg overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="sr-only">Foto</span>
                  </TableHead>
                  <CabecalhoData
                    direcao={parametros.direcao}
                    aoAlternar={aoAlternarDirecao}
                  />
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((consulta) => {
                  const paciente = pacientesPorId.get(consulta.pacienteId);
                  return (
                    <TableRow
                      key={consulta.id}
                      tabIndex={0}
                      onClick={() => aoAbrirConsulta(consulta.id)}
                      onKeyDown={(evento) => {
                        if (evento.key === "Enter") {
                          aoAbrirConsulta(consulta.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="w-14 pr-0">
                        {paciente && (
                          <FotoPaciente
                            arquivo={paciente.foto}
                            nome={paciente.nomeCompleto}
                            className="size-8"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatarData(consulta.iniciadoEm)}
                      </TableCell>
                      <TableCell>{formatarHora(consulta.iniciadoEm)}</TableCell>
                      <TableCell>
                        {consulta.finalizadoEm === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          formatarHora(consulta.finalizadoEm)
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusConsulta status={consulta.status} />
                      </TableCell>
                      <TableCell>
                        {consulta.pago ? (
                          "Sim"
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => aoMudarPagina(pagina - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => aoMudarPagina(pagina + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface PropsCabecalhoData {
  direcao: ParametrosListagemConsultas["direcao"];
  aoAlternar: () => void;
}

function CabecalhoData({ direcao, aoAlternar }: PropsCabecalhoData) {
  const crescente = direcao === "asc";
  const Icone = crescente ? ArrowUp : ArrowDown;

  return (
    <TableHead aria-sort={crescente ? "ascending" : "descending"}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5 gap-1 text-xs font-semibold tracking-wide text-foreground uppercase"
        onClick={aoAlternar}
      >
        Data
        <Icone aria-hidden="true" className="text-muted-foreground" />
      </Button>
    </TableHead>
  );
}
