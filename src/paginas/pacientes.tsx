import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FotoPaciente } from "@/components/foto-paciente";
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
import { consultasAbertas, criarConsulta } from "@/db/consultas";
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
  | {
      estado: "pronto";
      pacientes: Paciente[];
      saldos: Map<number, number>;
      abertas: Map<number, number>;
    }
  | { estado: "erro" };

export function PaginaPacientes() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [erroAoCriarConsulta, setErroAoCriarConsulta] = useState(false);
  const [parametros, setParametros] = useState<ParametrosListagem>({
    busca: "",
    ordenacao: { coluna: "nome", direcao: "asc" },
    pagina: 1,
  });
  const navegar = useNavigate();

  useEffect(() => {
    let ativo = true;
    Promise.all([listarPacientes(), saldosDeCreditos(), consultasAbertas()])
      .then(([pacientes, saldos, abertas]) => {
        if (ativo) setCarga({ estado: "pronto", pacientes, saldos, abertas });
      })
      .catch(() => {
        if (ativo) setCarga({ estado: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function novaConsulta(pacienteId: number) {
    try {
      const id = await criarConsulta(pacienteId);
      navegar(`/consultas/${id}`);
    } catch {
      setErroAoCriarConsulta(true);
    }
  }

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

      {erroAoCriarConsulta && (
        <p className="text-destructive">Não foi possível criar a consulta.</p>
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
            abertas={carga.abertas}
            parametros={parametros}
            aoBuscar={buscarPor}
            aoOrdenar={ordenarPor}
            aoMudarPagina={irParaPagina}
            aoNovaConsulta={novaConsulta}
          />
        ))}
    </section>
  );
}

interface PropsTabelaDePacientes {
  pacientes: Paciente[];
  saldos: Map<number, number>;
  /** Consulta Aberta por paciente: decide entre "Nova Consulta" e "Consulta". */
  abertas: Map<number, number>;
  parametros: ParametrosListagem;
  aoBuscar: (busca: string) => void;
  aoOrdenar: (coluna: OrdenacaoPacientes["coluna"]) => void;
  aoMudarPagina: (pagina: number) => void;
  aoNovaConsulta: (pacienteId: number) => void;
}

function TabelaDePacientes({
  pacientes,
  saldos,
  abertas,
  parametros,
  aoBuscar,
  aoOrdenar,
  aoMudarPagina,
  aoNovaConsulta,
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
                      <FotoPaciente
                        arquivo={paciente.foto}
                        nome={paciente.nomeCompleto}
                        className="size-8"
                      />
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
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/pacientes/${paciente.id}/editar`}>
                            Editar
                          </Link>
                        </Button>
                        <BotaoDeConsulta
                          consultaAberta={abertas.get(paciente.id)}
                          aoNovaConsulta={() => aoNovaConsulta(paciente.id)}
                        />
                      </div>
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

interface PropsBotaoDeConsulta {
  /** Id da Consulta Aberta do paciente; undefined = nenhuma. */
  consultaAberta: number | undefined;
  aoNovaConsulta: () => void;
}

/**
 * Regra da coluna Ações (spec 1.2): sem Consulta Aberta, "Nova Consulta" cria
 * e abre a consulta; com Aberta, "Consulta" leva direto a ela.
 */
function BotaoDeConsulta({
  consultaAberta,
  aoNovaConsulta,
}: PropsBotaoDeConsulta) {
  if (consultaAberta !== undefined) {
    return (
      <Button size="sm" asChild>
        <Link to={`/consultas/${consultaAberta}`}>Consulta</Link>
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={aoNovaConsulta}>
      Nova Consulta
    </Button>
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
