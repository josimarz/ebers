import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
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
import { type Consulta, listarConsultas } from "@/db/consultas";
import { listarPacientes, type Paciente } from "@/db/pacientes";
import { colacaoPtBr, filtrarPorNome } from "@/dominio/busca";
import { formatarData, formatarHora } from "@/dominio/data-hora";
import {
  montarPaginaDeConsultas,
  type ParametrosListagemConsultas,
} from "@/dominio/listagem-consultas";

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; consultas: Consulta[]; pacientes: Paciente[] }
  | { estado: "erro" };

export function PaginaConsultas() {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [parametros, setParametros] = useState<ParametrosListagemConsultas>({
    pacienteId: null,
    direcao: "desc",
    pagina: 1,
  });
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
      <h1 className="font-heading text-2xl font-semibold">Consultas</h1>

      {carga.estado === "carregando" && (
        <p className="text-muted-foreground">Carregando consultas…</p>
      )}

      {carga.estado === "erro" && (
        <p className="text-destructive">
          Não foi possível carregar as consultas.
        </p>
      )}

      {carga.estado === "pronto" &&
        (carga.consultas.length === 0 ? (
          <div className="glass-bg flex flex-col items-center gap-1 rounded-xl px-6 py-12 text-center">
            <p className="font-medium">Nenhuma consulta registrada</p>
            <p className="text-sm text-muted-foreground">
              As consultas criadas aparecerão aqui.
            </p>
          </div>
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
        <div className="glass-bg flex flex-col items-center gap-1 rounded-xl px-6 py-12 text-center">
          <p className="font-medium">Nenhuma consulta encontrada</p>
          <p className="text-sm text-muted-foreground">
            O paciente selecionado não tem consultas registradas.
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
                      <TableCell>
                        {paciente && (
                          <FotoPaciente
                            arquivo={paciente.foto}
                            nome={paciente.nomeCompleto}
                            className="size-8"
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatarData(consulta.iniciadoEm)}</TableCell>
                      <TableCell>{formatarHora(consulta.iniciadoEm)}</TableCell>
                      <TableCell>
                        {consulta.finalizadoEm === null
                          ? "—"
                          : formatarHora(consulta.finalizadoEm)}
                      </TableCell>
                      <TableCell>{consulta.status}</TableCell>
                      <TableCell>{consulta.pago ? "Sim" : "Não"}</TableCell>
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

interface PropsFiltroPaciente {
  pacientes: Paciente[];
  /** Id do paciente do filtro ativo; null = todas as consultas. */
  selecionado: number | null;
  aoSelecionar: (pacienteId: number | null) => void;
}

/**
 * Filtro por paciente da listagem (spec 2.4): dropdown com autocomplete. A
 * digitação só estreita as sugestões — o filtro da tabela muda ao selecionar
 * uma opção ou limpar.
 */
function FiltroPaciente({
  pacientes,
  selecionado,
  aoSelecionar,
}: PropsFiltroPaciente) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  /** Fecha as sugestões quando o foco deixa o filtro por inteiro. */
  function fecharSeSaiu(evento: React.FocusEvent) {
    if (!raiz.current?.contains(evento.relatedTarget)) setAberto(false);
  }

  const sugeridos = filtrarPorNome(pacientes, texto).sort((a, b) =>
    colacaoPtBr.compare(a.nomeCompleto, b.nomeCompleto),
  );

  function selecionar(paciente: Paciente) {
    aoSelecionar(paciente.id);
    setTexto(paciente.nomeCompleto);
    setAberto(false);
  }

  function limpar() {
    aoSelecionar(null);
    setTexto("");
    setAberto(false);
  }

  return (
    <div ref={raiz} className="relative flex max-w-xs gap-2">
      <Input
        role="combobox"
        aria-expanded={aberto}
        aria-controls="opcoes-filtro-paciente"
        aria-autocomplete="list"
        aria-label="Filtrar por paciente"
        placeholder="Filtrar por paciente"
        value={texto}
        onFocus={() => setAberto(true)}
        onBlur={fecharSeSaiu}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setAberto(true);
        }}
      />
      {selecionado !== null && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Limpar filtro"
          onClick={limpar}
          onBlur={fecharSeSaiu}
        >
          <X aria-hidden="true" />
        </Button>
      )}
      {aberto && sugeridos.length > 0 && (
        <div
          id="opcoes-filtro-paciente"
          role="listbox"
          aria-label="Pacientes"
          className="glass-bg absolute top-full right-0 left-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-input py-1 shadow-md"
        >
          {sugeridos.map((paciente) => (
            <button
              key={paciente.id}
              type="button"
              role="option"
              aria-selected={paciente.id === selecionado}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => selecionar(paciente)}
              onBlur={fecharSeSaiu}
            >
              {paciente.nomeCompleto}
            </button>
          ))}
        </div>
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
        className="-ml-2.5"
        onClick={aoAlternar}
      >
        Data
        <Icone aria-hidden="true" className="text-muted-foreground" />
      </Button>
    </TableHead>
  );
}
