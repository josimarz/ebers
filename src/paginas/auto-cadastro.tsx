import { MarcaEbers } from "@/components/marca-ebers";
import { PanoDeFundo } from "@/components/pano-de-fundo";
import { PaginaFormularioPaciente } from "./paciente-formulario";

/**
 * Modo tablet (spec 1.3; ADR-0003): a página única que qualquer navegador da
 * rede local enxerga. Só o Auto-cadastro — sem sidebar, sem links, sem como
 * sair da tela; o Modo tablet é esta página.
 */
export function PaginaAutoCadastro() {
  return (
    <div className="min-h-svh">
      <PanoDeFundo />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <MarcaEbers />
        <PaginaFormularioPaciente modo="tablet" />
      </main>
    </div>
  );
}
