import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { useEffect } from "react";
import { PainelConsulta } from "@/components/painel-consulta";
import { Button } from "@/components/ui/button";
import { SelectNativo } from "@/components/ui/select-nativo";
import { useSalvamentoAutomatico } from "@/hooks/use-salvamento-automatico";

type NivelDeTitulo = 1 | 2 | 3 | 4 | 5 | 6;
const NIVEIS_DE_TITULO: NivelDeTitulo[] = [1, 2, 3, 4, 5, 6];

/** Tamanhos de fonte oferecidos no toolbar, em px. */
const TAMANHOS_DE_FONTE = ["12", "14", "16", "18", "24", "32"];

/**
 * Cores básicas do toolbar (spec 2.3); a primeira volta à cor do tema. São
 * literais — não tokens (spec 4.2) — de propósito: viram conteúdo persistido
 * no HTML das Notas, que precisa reabrir igual sob qualquer tema.
 */
const CORES_BASICAS = [
  { rotulo: "Cor padrão", cor: null },
  { rotulo: "Cor vermelha", cor: "#dc2626" },
  { rotulo: "Cor laranja", cor: "#ea580c" },
  { rotulo: "Cor verde", cor: "#16a34a" },
  { rotulo: "Cor azul", cor: "#2563eb" },
  { rotulo: "Cor roxa", cor: "#9333ea" },
] as const;

interface PropsEditorNotas {
  valorInicial: string;
  desabilitado: boolean;
  aoSalvar: (html: string) => Promise<void>;
}

/**
 * Notas gravadas antes do editor eram texto plano de um textarea; entregues
 * ao Tiptap como HTML, perderiam quebras de linha e qualquer < ou & literal.
 * O HTML do próprio editor sempre começa num bloco conhecido; o resto é
 * texto plano e vira parágrafos com os sinais escapados.
 */
function notasComoHtml(notas: string): string {
  if (
    notas === "" ||
    /^<(p|h[1-6]|ul|ol|blockquote|pre|hr)[\s>/]/.test(notas)
  ) {
    return notas;
  }
  const escapado = notas
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escapado
    .split("\n")
    .map((linha) => `<p>${linha}</p>`)
    .join("");
}

/**
 * Volta cor ou tamanho ao padrão. O removeEmptyTextStyle do Tiptap não limpa
 * a marca armazenada no cursor recolhido; sem remover o textStyle inteiro
 * quando nenhum atributo resta, o texto digitado em seguida sairia embrulhado
 * num <span> vazio.
 */
function limparEstiloDeTexto(editor: Editor, atributo: "color" | "fontSize") {
  const restantes = { ...editor.getAttributes("textStyle"), [atributo]: null };
  const cadeia = editor.chain().focus();
  const semAtributo =
    atributo === "color" ? cadeia.unsetColor() : cadeia.unsetFontSize();
  if (Object.values(restantes).some(Boolean)) {
    semAtributo.run();
  } else {
    semAtributo.unsetMark("textStyle").run();
  }
}

/**
 * Editor HTML das Notas da Consulta (spec 2.3): negrito, itálico, sublinhado,
 * riscado, cores básicas, tamanho de fonte e títulos h1–h6, com o mesmo
 * salvamento automático do Conteúdo — o HTML inteiro é persistido a cada
 * pausa da digitação.
 */
export function EditorNotas({
  valorInicial,
  desabilitado,
  aoSalvar,
}: PropsEditorNotas) {
  const registrar = useSalvamentoAutomatico(aoSalvar);
  const editor = useEditor({
    extensions: [StarterKit, TextStyleKit],
    content: notasComoHtml(valorInicial),
    editable: !desabilitado,
    onUpdate: ({ editor }) => registrar(editor.getHTML()),
    editorProps: {
      attributes: {
        "aria-label": "Notas",
        role: "textbox",
        "aria-multiline": "true",
        class: "tiptap min-h-64 flex-1 p-4 outline-none",
      },
    },
  });

  // Aberta → Finalizada mantém a edição; só a Cancelada chega aqui somente
  // leitura. Ainda assim, o estado do editor segue a prop, não a criação.
  useEffect(() => {
    editor?.setEditable(!desabilitado);
  }, [editor, desabilitado]);

  if (editor === null) return null;

  return (
    <PainelConsulta
      titulo={<span>Notas</span>}
      descricao="Anotações da terapeuta"
      desabilitado={desabilitado}
    >
      <BarraDeFormatacao editor={editor} desabilitado={desabilitado} />
      <EditorContent
        editor={editor}
        className="editor-notas flex flex-1 flex-col"
      />
    </PainelConsulta>
  );
}

function BarraDeFormatacao({
  editor,
  desabilitado,
}: {
  editor: Editor;
  desabilitado: boolean;
}) {
  const estado = useEditorState({
    editor,
    selector: ({ editor }) => ({
      negrito: editor.isActive("bold"),
      italico: editor.isActive("italic"),
      sublinhado: editor.isActive("underline"),
      riscado: editor.isActive("strike"),
      titulo:
        NIVEIS_DE_TITULO.find((nivel) =>
          editor.isActive("heading", { level: nivel }),
        ) ?? 0,
      tamanho: (editor.getAttributes("textStyle").fontSize ?? "") as string,
    }),
  });

  const marcas = [
    {
      rotulo: "Negrito",
      Icone: Bold,
      ativo: estado.negrito,
      alternar: () => editor.chain().focus().toggleBold().run(),
    },
    {
      rotulo: "Itálico",
      Icone: Italic,
      ativo: estado.italico,
      alternar: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      rotulo: "Sublinhado",
      Icone: Underline,
      ativo: estado.sublinhado,
      alternar: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      rotulo: "Riscado",
      Icone: Strikethrough,
      ativo: estado.riscado,
      alternar: () => editor.chain().focus().toggleStrike().run(),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatação das Notas"
      className="flex flex-wrap items-center gap-1 border-b border-border/60 px-3 py-2"
    >
      {marcas.map(({ rotulo, Icone, ativo, alternar }) => (
        <Button
          key={rotulo}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={rotulo}
          aria-pressed={ativo}
          disabled={desabilitado}
          className="aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={alternar}
        >
          <Icone />
        </Button>
      ))}

      <DivisoriaDaBarra />

      <SelectNativo
        aria-label="Título"
        value={String(estado.titulo)}
        disabled={desabilitado}
        className="h-7 w-32 text-xs"
        onChange={(evento) => {
          const nivel = Number(evento.target.value);
          const cadeia = editor.chain().focus();
          if (nivel === 0) {
            cadeia.setParagraph().run();
          } else {
            cadeia.setHeading({ level: nivel as NivelDeTitulo }).run();
          }
        }}
      >
        <option value="0">Texto normal</option>
        {NIVEIS_DE_TITULO.map((nivel) => (
          <option key={nivel} value={nivel}>
            Título {nivel}
          </option>
        ))}
      </SelectNativo>

      <SelectNativo
        aria-label="Tamanho da fonte"
        value={estado.tamanho.replace("px", "")}
        disabled={desabilitado}
        className="h-7 w-22 text-xs"
        onChange={(evento) => {
          const tamanho = evento.target.value;
          if (tamanho === "") {
            limparEstiloDeTexto(editor, "fontSize");
          } else {
            editor.chain().focus().setFontSize(`${tamanho}px`).run();
          }
        }}
      >
        <option value="">Padrão</option>
        {TAMANHOS_DE_FONTE.map((tamanho) => (
          <option key={tamanho} value={tamanho}>
            {tamanho}
          </option>
        ))}
      </SelectNativo>

      <DivisoriaDaBarra />

      {CORES_BASICAS.map(({ rotulo, cor }) => (
        <Button
          key={rotulo}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={rotulo}
          disabled={desabilitado}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => {
            if (cor === null) {
              limparEstiloDeTexto(editor, "color");
            } else {
              editor.chain().focus().setColor(cor).run();
            }
          }}
        >
          <span
            aria-hidden="true"
            className="size-3.5 rounded-full border border-border"
            style={{ backgroundColor: cor ?? "var(--foreground)" }}
          />
        </Button>
      ))}
    </div>
  );
}

function DivisoriaDaBarra() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}
