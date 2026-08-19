import { X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colacaoPtBr, filtrarPorNome } from "@/dominio/busca";

interface PacienteFiltravel {
  id: number;
  nomeCompleto: string;
}

interface PropsFiltroPaciente {
  pacientes: PacienteFiltravel[];
  /** Id do paciente do filtro ativo; null = sem filtro. */
  selecionado: number | null;
  aoSelecionar: (pacienteId: number | null) => void;
}

/**
 * Filtro por paciente das listagens (specs 2.4 e 3.1): dropdown com
 * autocomplete. A digitação só estreita as sugestões — o filtro da tabela
 * muda ao selecionar uma opção ou limpar. Montado já com um selecionado
 * (atalho "Listar consultas" do Controle financeiro), nasce com o nome dele.
 */
export function FiltroPaciente({
  pacientes,
  selecionado,
  aoSelecionar,
}: PropsFiltroPaciente) {
  const [texto, setTexto] = useState(
    () =>
      pacientes.find((paciente) => paciente.id === selecionado)?.nomeCompleto ??
      "",
  );
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  /** Fecha as sugestões quando o foco deixa o filtro por inteiro. */
  function fecharSeSaiu(evento: React.FocusEvent) {
    if (!raiz.current?.contains(evento.relatedTarget)) setAberto(false);
  }

  const sugeridos = filtrarPorNome(pacientes, texto).sort((a, b) =>
    colacaoPtBr.compare(a.nomeCompleto, b.nomeCompleto),
  );

  function selecionar(paciente: PacienteFiltravel) {
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
          className="glass-frosted absolute top-full right-0 left-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg py-1"
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
