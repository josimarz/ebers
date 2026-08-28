// Dublê da fronteira da Prévia (src/db/previa.ts), para vi.mock:
//   vi.mock("@/db/previa", () => import("@/testes/previa-falsa"));
// Por padrão a Prévia está disponível; os testes emitem o que o reconhecedor
// "ouviu" com emitirTextoDaPrevia e observam janelas e áudio recebidos.
// Reiniciar em beforeEach.

import type { DisponibilidadeDaPrevia, EventoPrevia } from "@/db/previa";

interface PreviaFalsa {
  aoEvento: (evento: EventoPrevia) => void;
  parada: boolean;
  janelasFechadas: number;
  amostrasRecebidas: number;
}

let previa: PreviaFalsa | null = null;
let disponibilidade: DisponibilidadeDaPrevia = "disponivel";
let falhaAoIniciar: unknown = null;
let avisoDePreviaJaDado = false;

export function reiniciarPreviaFalsa(): void {
  previa = null;
  disponibilidade = "disponivel";
  falhaAoIniciar = null;
  avisoDePreviaJaDado = false;
}

/** O sistema não tem reconhecimento on-device em pt-BR (ou permissão). */
export function programarPreviaIndisponivel(): void {
  disponibilidade = "indisponivel";
}

/** A Prévia não existe nesta plataforma (fora do macOS 13+). */
export function programarPreviaInexistente(): void {
  disponibilidade = "inexistente";
}

/** Programa a rejeição do próximo iniciarPrevia. */
export function programarFalhaAoIniciarPrevia(erro: unknown): void {
  falhaAoIniciar = erro;
}

/** A Prévia está aberta (iniciada e não parada)? */
export function previaEstaAtiva(): boolean {
  return previa !== null && !previa.parada;
}

/** Quantas janelas foram fechadas desde o início da Prévia. */
export function janelasFechadasDaPrevia(): number {
  return previa?.janelasFechadas ?? 0;
}

/** Total de amostras (16 kHz) entregues à Prévia. */
export function amostrasRecebidasPelaPrevia(): number {
  return previa?.amostrasRecebidas ?? 0;
}

function ativa(): PreviaFalsa {
  if (previa === null) throw new Error("Nenhuma Prévia iniciada");
  return previa;
}

/** O reconhecedor devolve o texto ouvido até agora na janela. */
export function emitirTextoDaPrevia(janela: number, texto: string): void {
  ativa().aoEvento({ tipo: "texto", janela, texto });
}

/** O reconhecedor falha na janela. */
export function emitirErroDaPrevia(janela: number, mensagem: string): void {
  ativa().aoEvento({ tipo: "erro", janela, mensagem });
}

export async function disponibilidadeDaPrevia(): Promise<DisponibilidadeDaPrevia> {
  return disponibilidade;
}

export function deveAvisarPreviaIndisponivel(): boolean {
  if (avisoDePreviaJaDado) return false;
  avisoDePreviaJaDado = true;
  return true;
}

export async function iniciarPrevia(
  aoEvento: (evento: EventoPrevia) => void,
): Promise<void> {
  if (falhaAoIniciar !== null) {
    const falha = falhaAoIniciar;
    falhaAoIniciar = null;
    throw falha;
  }
  previa = {
    aoEvento,
    parada: false,
    janelasFechadas: 0,
    amostrasRecebidas: 0,
  };
}

export async function enviarAudioDaPrevia(bloco: Float32Array): Promise<void> {
  ativa().amostrasRecebidas += bloco.length;
}

export async function fecharJanelaDaPrevia(): Promise<void> {
  ativa().janelasFechadas += 1;
}

export async function pararPrevia(): Promise<void> {
  ativa().parada = true;
}
