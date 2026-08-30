import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Plus,
  Search,
  SearchX,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AvisoErro } from "@/components/aviso";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FotoPaciente } from "@/components/foto-paciente";
import { SaldoCreditos } from "@/components/saldo-creditos";
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
import { cn } from "@/lib/utils";

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
      <CabecalhoPagina
        titulo="Pacientes"
        descricao="O cadastro de cada paciente e a porta de entrada da Consulta."
        acoes={
          <Button asChild>
            <Link to="/pacientes/novo">
              <Plus />
              Novo Paciente
            </Link>
          </Button>
        }
      />

      {carga.estado === "carregando" && (
        <p className="text-sm text-muted-foreground">Carregando pacientes…</p>
      )}

      {carga.estado === "erro" && (
        <AvisoErro>Não foi possível carregar os pacientes.</AvisoErro>
      )}

      {erroAoCriarConsulta && (
        <AvisoErro>Não foi possível criar a consulta.</AvisoErro>
      )}

      {carga.estado === "pronto" &&
        (carga.pacientes.length === 0 ? (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum paciente cadastrado"
            descricao="Os pacientes cadastrados aparecerão aqui."
          />
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
      <div className="relative max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={parametros.busca}
          onChange={(evento) => aoBuscar(evento.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="pl-8"
        />
      </div>

      {itens.length === 0 ? (
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhum paciente encontrado"
          descricao={`Nenhum nome corresponde à busca “${parametros.busca.trim()}”.`}
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
                    <TableCell>
                      {calcularIdade(paciente.dataNascimento, hoje)}
                    </TableCell>
                    <TableCell>{paciente.telefone1}</TableCell>
                    <TableCell>
                      <Valor>{paciente.periodicidade}</Valor>
                    </TableCell>
                    <TableCell>
                      <Valor>{paciente.diaSemanaConsulta}</Valor>
                    </TableCell>
                    <TableCell>
                      <SaldoCreditos saldo={saldos.get(paciente.id) ?? 0} />
                    </TableCell>
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

/** Valor opcional de uma célula: o travessão de "não informado" sai apagado. */
function Valor({ children }: { children: string | null }) {
  if (children === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return children;
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
        className={cn(
          "-ml-2.5 gap-1 text-xs font-semibold tracking-wide uppercase",
          ativa ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => aoOrdenar(coluna)}
      >
        {children}
        <Icone aria-hidden="true" className="text-muted-foreground" />
      </Button>
    </TableHead>
  );
}
