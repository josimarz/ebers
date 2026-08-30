import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { AvisoErro } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type EnderecoAutoCadastro, enderecoAutoCadastro } from "@/db/servidor";

interface PropsModalAutoCadastro {
  aoFechar: () => void;
}

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; endereco: EnderecoAutoCadastro }
  | { estado: "erro" };

async function consultarEndereco(): Promise<Carga> {
  try {
    return { estado: "pronto", endereco: await enderecoAutoCadastro() };
  } catch {
    return { estado: "erro" };
  }
}

/**
 * Modal "Auto-cadastro no tablet" (spec 1.3; issue #21): o QR code do
 * endereço do servidor local, para a terapeuta ler com a câmera do tablet do
 * consultório. O endereço é consultado a cada abertura — ele muda quando o
 * computador troca de rede — e de novo em "Tentar de novo".
 */
export function ModalAutoCadastro({ aoFechar }: PropsModalAutoCadastro) {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });

  useEffect(() => {
    let ativo = true;
    consultarEndereco().then((carga) => {
      if (ativo) setCarga(carga);
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function tentarDeNovo() {
    setCarga({ estado: "carregando" });
    setCarga(await consultarEndereco());
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-cadastro no tablet</DialogTitle>
          <DialogDescription>
            Aponte a câmera do tablet para o código: ele abre o formulário em
            que o paciente preenche o próprio cadastro.
          </DialogDescription>
        </DialogHeader>

        {carga.estado === "carregando" && (
          <p className="text-sm text-muted-foreground">
            Procurando o endereço…
          </p>
        )}

        {carga.estado === "pronto" && carga.endereco.estado === "no-ar" && (
          <CodigoDoEndereco url={carga.endereco.url} />
        )}

        {carga.estado === "pronto" &&
          carga.endereco.estado === "fora-do-ar" && (
            <Problema aoTentarDeNovo={tentarDeNovo}>
              O Auto-cadastro não está no ar. Feche e abra o Ebers de novo.
            </Problema>
          )}

        {carga.estado === "pronto" && carga.endereco.estado === "sem-rede" && (
          <Problema aoTentarDeNovo={tentarDeNovo}>
            Este computador não está conectado a nenhuma rede. Conecte-o ao
            Wi-Fi do consultório.
          </Problema>
        )}

        {carga.estado === "erro" && (
          <Problema aoTentarDeNovo={tentarDeNovo}>
            Não foi possível obter o endereço. Tente de novo.
          </Problema>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** O QR code, o endereço por extenso (plano B para digitar) e os passos. */
function CodigoDoEndereco({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        {/* Preto sobre branco dentro do próprio SVG, com a zona de silêncio
            (marginSize) que a leitura pela câmera exige: é um gráfico, não
            uma superfície do tema — por isso não usa os tokens de vidro. */}
        <div className="overflow-hidden rounded-xl border border-glass-border">
          <QRCodeSVG
            value={url}
            size={224}
            level="M"
            marginSize={2}
            role="img"
            aria-label="QR code do endereço do Auto-cadastro"
          />
        </div>
        <p className="font-mono text-sm text-muted-foreground">{url}</p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>O tablet precisa estar no Wi-Fi do consultório.</li>
        <li>Toque no link que aparece na câmera.</li>
        <li>
          Salve a página nos favoritos: o endereço vale enquanto o Ebers estiver
          aberto. Se um dia o favorito parar de abrir, leia o código de novo.
        </li>
      </ol>
    </div>
  );
}

/** No lugar do QR code: o que não deu e, se houver, o que fazer. */
function Problema({
  children,
  aoTentarDeNovo,
}: {
  children: React.ReactNode;
  aoTentarDeNovo: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <AvisoErro className="w-full">{children}</AvisoErro>
      <Button type="button" variant="outline" onClick={aoTentarDeNovo}>
        Tentar de novo
      </Button>
    </div>
  );
}
