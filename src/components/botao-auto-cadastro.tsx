import { QrCode } from "lucide-react";
import { useState } from "react";
import { ModalAutoCadastro } from "@/components/modal-auto-cadastro";
import { Button } from "@/components/ui/button";

/**
 * Ação global do cabeçalho do Modo desktop (issue #21): abre a modal com o QR
 * code do Auto-cadastro para a terapeuta ler com o tablet. Vive no cabeçalho
 * grudado, e não num botão flutuante, para não cobrir a barra "Salvar" dos
 * formulários nem a paginação das tabelas (docs/design.md §3.1).
 */
export function BotaoAutoCadastro() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberta(true)}
      >
        <QrCode aria-hidden="true" />
        Auto-cadastro
      </Button>
      {aberta && <ModalAutoCadastro aoFechar={() => setAberta(false)} />}
    </>
  );
}
