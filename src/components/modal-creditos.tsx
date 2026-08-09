import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ajustarCreditos,
  listarMovimentos,
  venderCreditos,
} from "@/db/creditos";
import {
  erroDoAjuste,
  type MovimentoDoExtrato,
  montarExtrato,
  parsearQuantidade,
  saldoDoExtrato,
  totalDaVenda,
  vendaValida,
} from "@/dominio/creditos";
import { formatarReais } from "@/dominio/dinheiro";

interface PacienteDosCreditos {
  id: number;
  nomeCompleto: string;
  valorConsultaCentavos: number;
}

interface PropsModalCreditos {
  paciente: PacienteDosCreditos;
  aoFechar: () => void;
  /** Novo saldo após Venda/Ajuste — a coluna Créditos da listagem acompanha. */
  aoMudarSaldo: (saldo: number) => void;
}

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; movimentos: MovimentoDoExtrato[] }
  | { estado: "erro" };

/**
 * Modal único "Créditos" da listagem financeira (spec 3.2): saldo derivado do
 * extrato, extrato completo sem paginação e as ações Vender e Ajustar.
 */
export function ModalCreditos({
  paciente,
  aoFechar,
  aoMudarSaldo,
}: PropsModalCreditos) {
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [quantidadeVenda, setQuantidadeVenda] = useState("");
  const [quantidadeAjuste, setQuantidadeAjuste] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [erroVenda, setErroVenda] = useState<string | null>(null);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    listarMovimentos(paciente.id)
      .then((movimentos) => {
        if (ativo) setCarga({ estado: "pronto", movimentos });
      })
      .catch(() => {
        if (ativo) setCarga({ estado: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, [paciente.id]);

  // Relê o extrato após cada gravação: saldo e linhas saem sempre do banco, e
  // a página é avisada do novo saldo para a coluna Créditos acompanhar.
  async function recarregar() {
    try {
      const movimentos = await listarMovimentos(paciente.id);
      setCarga({ estado: "pronto", movimentos });
      aoMudarSaldo(saldoDoExtrato(movimentos));
    } catch {
      setCarga({ estado: "erro" });
    }
  }

  const quantidadeDaVenda = parsearQuantidade(quantidadeVenda);

  async function vender(evento: React.FormEvent) {
    evento.preventDefault();
    if (!vendaValida(quantidadeDaVenda) || ocupado) return;
    setOcupado(true);
    setErroVenda(null);
    try {
      await venderCreditos(paciente.id, quantidadeDaVenda);
      setQuantidadeVenda("");
      await recarregar();
    } catch {
      setErroVenda("Não foi possível registrar a venda.");
    } finally {
      setOcupado(false);
    }
  }

  async function ajustar(evento: React.FormEvent) {
    evento.preventDefault();
    if (carga.estado !== "pronto" || ocupado) return;
    const quantidadeDoAjuste = parsearQuantidade(quantidadeAjuste);
    const erro = erroDoAjuste(
      saldoDoExtrato(carga.movimentos),
      quantidadeDoAjuste,
      motivoAjuste,
    );
    if (erro !== null || quantidadeDoAjuste === null) {
      setErroAjuste(erro);
      return;
    }
    setOcupado(true);
    setErroAjuste(null);
    try {
      await ajustarCreditos(paciente.id, quantidadeDoAjuste, motivoAjuste);
      setQuantidadeAjuste("");
      setMotivoAjuste("");
      await recarregar();
    } catch {
      setErroAjuste("Não foi possível registrar o ajuste.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créditos de {paciente.nomeCompleto}</DialogTitle>
          <DialogDescription>
            Saldo, extrato de movimentos e as ações de venda e ajuste.
          </DialogDescription>
        </DialogHeader>

        {carga.estado === "carregando" && (
          <p className="text-muted-foreground">Carregando créditos…</p>
        )}

        {carga.estado === "erro" && (
          <p className="text-destructive">
            Não foi possível carregar os créditos.
          </p>
        )}

        {carga.estado === "pronto" && (
          <div className="flex flex-col gap-6">
            <SaldoAtual saldo={saldoDoExtrato(carga.movimentos)} />

            <form onSubmit={vender} className="flex flex-col gap-2">
              <p className="font-medium">Vender</p>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="quantidade-venda"
                    className="text-sm text-muted-foreground"
                  >
                    Quantidade a vender
                  </label>
                  <Input
                    id="quantidade-venda"
                    type="number"
                    min={1}
                    step={1}
                    className="w-32"
                    value={quantidadeVenda}
                    onChange={(evento) =>
                      setQuantidadeVenda(evento.target.value)
                    }
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!vendaValida(quantidadeDaVenda) || ocupado}
                >
                  Vender
                </Button>
              </div>
              {vendaValida(quantidadeDaVenda) && (
                <p className="text-sm text-muted-foreground">
                  Total: R${" "}
                  {formatarReais(
                    totalDaVenda(
                      quantidadeDaVenda,
                      paciente.valorConsultaCentavos,
                    ),
                  )}
                </p>
              )}
              {erroVenda !== null && (
                <p className="text-sm text-destructive">{erroVenda}</p>
              )}
            </form>

            <form onSubmit={ajustar} className="flex flex-col gap-2">
              <p className="font-medium">Ajustar</p>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="quantidade-ajuste"
                    className="text-sm text-muted-foreground"
                  >
                    Quantidade do ajuste
                  </label>
                  <Input
                    id="quantidade-ajuste"
                    type="number"
                    step={1}
                    className="w-32"
                    value={quantidadeAjuste}
                    onChange={(evento) =>
                      setQuantidadeAjuste(evento.target.value)
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label
                    htmlFor="motivo-ajuste"
                    className="text-sm text-muted-foreground"
                  >
                    Motivo
                  </label>
                  <Input
                    id="motivo-ajuste"
                    value={motivoAjuste}
                    onChange={(evento) => setMotivoAjuste(evento.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={ocupado}>
                  Ajustar
                </Button>
              </div>
              {erroAjuste !== null && (
                <p className="text-sm text-destructive">{erroAjuste}</p>
              )}
            </form>

            <Extrato movimentos={carga.movimentos} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaldoAtual({ saldo }: { saldo: number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Saldo atual</p>
      <p className="font-heading text-3xl font-semibold">
        {saldo} {saldo === 1 ? "crédito" : "créditos"}
      </p>
    </div>
  );
}

/** Extrato completo, do mais recente ao mais antigo, sem paginação (spec 3.2). */
function Extrato({ movimentos }: { movimentos: MovimentoDoExtrato[] }) {
  if (movimentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum movimento de crédito.
      </p>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Referência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {montarExtrato(movimentos).map((linha) => (
            <TableRow key={linha.id}>
              <TableCell>{linha.dataHora}</TableCell>
              <TableCell>{linha.tipo}</TableCell>
              <TableCell>{linha.quantidade}</TableCell>
              <TableCell>{linha.referencia}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
