import { PaginaFormularioPaciente } from "./paciente-formulario";

/**
 * Modo tablet (spec 1.3; ADR-0003): a página única que qualquer navegador da
 * rede local enxerga. Só o Auto-cadastro — sem sidebar, sem links, sem como
 * sair da tela; o Modo tablet é esta página.
 */
export function PaginaAutoCadastro() {
  return (
    <div className="min-h-svh">
      {/* Pano de fundo com o gradiente do tema, como no layout do desktop */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-20 [background:var(--gradient)]"
      />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <span className="font-heading text-lg font-semibold">Ebers</span>
        <PaginaFormularioPaciente modo="tablet" />
      </main>
    </div>
  );
}
