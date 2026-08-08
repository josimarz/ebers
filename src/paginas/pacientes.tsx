import { ArrowDown, ArrowUp, ChevronsUpDown, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saldosDeCreditos } from "@/db/creditos";
import { listarPacientes, type Paciente } from "@/db/pacientes";
import { calcularIdade, hojeIso } from "@/dominio/idade";
import {
  alternarOrdenacao,
  montarPaginaDePacientes,
  type OrdenacaoPacientes,
  type ParametrosListagem,
} from "@/dominio/listagem-pacientes";

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; pacientes: Paciente[]; saldos: Map<number, number> }
  | { estado: "erro" };

export function PaginaPacientes() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [parametros, setParametros] = useState<ParametrosListagem>({
    busca: "",
    ordenacao: { coluna: "nome", direcao: "asc" },
    pagina: 1,
  });

  useEffect(() => {
    let ativo = true;
    Promise.all([listarPacientes(), saldosDeCreditos()])
      .then(([pacientes, saldos]) => {
        if (ativo) setCarga({ estado: "pronto", pacientes, saldos });
      })
      .catch(() => {
        if (ativo) setCarga({ estado: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Ordenar e buscar recomeçam da primeira página; só navegar a preserva.
  function ordenarPor(coluna: OrdenacaoPacientes["coluna"]) {
    setParametros((atual) => ({
      ...atual,
      ordenacao: alternarOrdenacao(atual.ordenacao, coluna),
      pagina: 1,
    }));
  }

  function buscarPor(busca: string) {
    setParametros((atual) => ({ ...atual, busca, pagina: 1 }));
  }

  function irParaPagina(pagina: number) {
    setParametros((atual) => ({ ...atual, pagina }));
  }

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
          <TabelaDePacientes
            pacientes={carga.pacientes}
            saldos={carga.saldos}
            parametros={parametros}
            aoBuscar={buscarPor}
            aoOrdenar={ordenarPor}
            aoMudarPagina={irParaPagina}
          />
        ))}
    </section>
  );
}

interface PropsTabelaDePacientes {
  pacientes: Paciente[];
  saldos: Map<number, number>;
  parametros: ParametrosListagem;
  aoBuscar: (busca: string) => void;
  aoOrdenar: (coluna: OrdenacaoPacientes["coluna"]) => void;
  aoMudarPagina: (pagina: number) => void;
}

function TabelaDePacientes({
  pacientes,
  saldos,
  parametros,
  aoBuscar,
  aoOrdenar,
  aoMudarPagina,
}: PropsTabelaDePacientes) {
  const { itens, pagina, totalPaginas } = montarPaginaDePacientes(
    pacientes,
    parametros,
  );
  const hoje = hojeIso();

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        value={parametros.busca}
        onChange={(evento) => aoBuscar(evento.target.value)}
        placeholder="Buscar por nome"
        aria-label="Buscar por nome"
        className="max-w-xs"
      />

      {itens.length === 0 ? (
        <div className="glass-bg flex flex-col items-center gap-1 rounded-xl px-6 py-12 text-center">
          <p className="font-medium">Nenhum paciente encontrado</p>
          <p className="text-sm text-muted-foreground">
            Nenhum nome corresponde à busca “{parametros.busca.trim()}”.
          </p>
        </div>
      ) : (
        <>
          <div className="glass-bg overflow-hidden rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="sr-only">Foto</span>
                  </TableHead>
                  <CabecalhoOrdenavel
                    coluna="nome"
                    ordenacao={parametros.ordenacao}
                    aoOrdenar={aoOrdenar}
                  >
                    Nome
                  </CabecalhoOrdenavel>
                  <CabecalhoOrdenavel
                    coluna="idade"
                    ordenacao={parametros.ordenacao}
                    aoOrdenar={aoOrdenar}
                  >
                    Idade
                  </CabecalhoOrdenavel>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Dia da semana</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((paciente) => (
                  <TableRow key={paciente.id}>
                    <TableCell>
                      {/* Placeholder até o ticket de Foto de perfil. */}
                      <span
                        aria-hidden="true"
                        className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      >
                        <User className="size-4" />
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {paciente.nomeCompleto}
                    </TableCell>
                    <TableCell>
                      {calcularIdade(paciente.dataNascimento, hoje)}
                    </TableCell>
                    <TableCell>{paciente.telefone1}</TableCell>
                    <TableCell>{paciente.periodicidade ?? "—"}</TableCell>
                    <TableCell>{paciente.diaSemanaConsulta ?? "—"}</TableCell>
                    <TableCell>{saldos.get(paciente.id) ?? 0}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/pacientes/${paciente.id}/editar`}>
                          Editar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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

interface PropsCabecalhoOrdenavel {
  coluna: OrdenacaoPacientes["coluna"];
  ordenacao: OrdenacaoPacientes;
  aoOrdenar: (coluna: OrdenacaoPacientes["coluna"]) => void;
  children: string;
}

function CabecalhoOrdenavel({
  coluna,
  ordenacao,
  aoOrdenar,
  children,
}: PropsCabecalhoOrdenavel) {
  const ativa = ordenacao.coluna === coluna;
  const crescente = ativa && ordenacao.direcao === "asc";
  const Icone = ativa ? (crescente ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead
      aria-sort={ativa ? (crescente ? "ascending" : "descending") : undefined}
    >
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5"
        onClick={() => aoOrdenar(coluna)}
      >
        {children}
        <Icone aria-hidden="true" className="text-muted-foreground" />
      </Button>
    </TableHead>
  );
}
