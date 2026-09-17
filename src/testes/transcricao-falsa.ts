// Dublê da fronteira de transcrição (src/db/transcricao.ts), para vi.mock:
//   vi.mock("@/db/transcricao", () => import("@/testes/transcricao-falsa"));
// Só registra e responde ao que os testes programam: as regras de fechar
// Janela (12 s, pausa de 0,6 s, teto de 28 s) vivem no backend
// (src-tauri/src/gravador.rs) e são testadas lá. Os testes dizem quando a
// Janela fecha (programarFechamento), o que restou ao desligar
// (programarRestoComFala) e o que o Whisper responde (programarTranscricao).
// Reiniciar em beforeEach.

import type { Corte, Id } from "@/db/transcricao";

interface GravacaoFalsa {
  id: Id;
  /** Amostras (16 kHz) recebidas na Janela aberta. */
  amostras: number;
}

type Resposta =
  | { tipo: "ok"; valor: string | Promise<string> }
  | { tipo: "erro"; erro: unknown };

let gravacao: GravacaoFalsa | null = null;
let ultimaGravacao = 0;
let semModelo = false;
let fechamentoProgramado: { comFala: boolean } | null = null;
let restoComFala = false;
/** Amostras de cada Trecho fechado com fala; o id do Trecho é o índice + 1. */
const trechos: number[] = [];
/** Amostras dos Trechos já pedidos ao Whisper, na ordem dos pedidos. */
const transcritos: number[] = [];
const respostas: Resposta[] = [];

export function reiniciarTranscricaoFalsa(): void {
  gravacao = null;
  ultimaGravacao = 0;
  semModelo = false;
  fechamentoProgramado = null;
  restoComFala = false;
  trechos.length = 0;
  transcritos.length = 0;
  respostas.length = 0;
}

/** O app está sem modelo (instalação avariada): iniciar devolve nulo. */
export function programarSemModelo(): void {
  semModelo = true;
}

/** O próximo bloco fecha a Janela — com fala (um Trecho vai à fila) ou sem. */
export function programarFechamento(comFala: boolean): void {
  fechamentoProgramado = { comFala };
}

/** Ao desligar, restou fala na Janela aberta: um Trecho vai à fila. */
export function programarRestoComFala(): void {
  restoComFala = true;
}

/** Programa o texto (ou a promessa dele) da próxima Transcrição. */
export function programarTranscricao(texto: string | Promise<string>): void {
  respostas.push({ tipo: "ok", valor: texto });
}

/** Programa a falha da próxima Transcrição. */
export function programarFalhaNaTranscricao(erro: unknown): void {
  respostas.push({ tipo: "erro", erro });
}

/** Tamanho, em amostras a 16 kHz, de cada Trecho já pedido ao Whisper. */
export function trechosTranscritos(): readonly number[] {
  return transcritos;
}

/** Há gravação em andamento no backend falso? */
export function gravacaoEstaAtiva(): boolean {
  return gravacao !== null;
}

export async function iniciarTranscricao(): Promise<Id | null> {
  if (semModelo) return null;
  ultimaGravacao += 1;
  gravacao = { id: ultimaGravacao, amostras: 0 };
  return gravacao.id;
}

export async function enviarBloco(id: Id, bloco: Float32Array): Promise<Corte> {
  if (gravacao === null || gravacao.id !== id) {
    return { fechou: false, trecho: null };
  }
  gravacao.amostras += bloco.length;
  const fechamento = fechamentoProgramado;
  if (fechamento === null) return { fechou: false, trecho: null };
  fechamentoProgramado = null;
  const amostras = gravacao.amostras;
  gravacao.amostras = 0;
  if (!fechamento.comFala) return { fechou: true, trecho: null };
  trechos.push(amostras);
  return { fechou: true, trecho: trechos.length };
}

export async function descarregarAudio(id: Id): Promise<Id | null> {
  if (gravacao === null || gravacao.id !== id) return null;
  const amostras = gravacao.amostras;
  gravacao = null;
  if (!restoComFala) return null;
  restoComFala = false;
  trechos.push(amostras);
  return trechos.length;
}

export async function transcreverTrecho(trecho: Id): Promise<string> {
  const amostras = trechos[trecho - 1];
  if (amostras === undefined) throw new Error(`Trecho ${trecho} desconhecido`);
  transcritos.push(amostras);
  const resposta = respostas.shift();
  if (resposta === undefined) {
    throw new Error("Sem Transcrição programada para o Trecho");
  }
  if (resposta.tipo === "erro") throw resposta.erro;
  return await resposta.valor;
}
