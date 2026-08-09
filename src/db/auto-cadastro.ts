import type { DadosPaciente } from "@/dominio/paciente";
import { CpfJaCadastradoError } from "./pacientes";

/**
 * Fronteira do Modo tablet com o servidor local (src-tauri/src/servidor.rs):
 * fora do webview não há `invoke`, então o Auto-cadastro fala com as rotas
 * REST — restritas a este fluxo (ADR-0003). Espelha as assinaturas de
 * criarPaciente (db/pacientes.ts) e salvarFoto (db/fotos.ts), para o
 * formulário só trocar a persistência conforme o modo.
 */

/** Dados que viajam no Auto-cadastro: sem os campos que o tablet oculta —
 * o servidor aplica o Valor padrão da consulta e recusa campos a mais. */
export type DadosAutoCadastro = Omit<
  DadosPaciente,
  "valorConsultaCentavos" | "periodicidade" | "diaSemanaConsulta"
>;

export async function criarPacienteAutoCadastro(
  dados: DadosPaciente,
): Promise<void> {
  const {
    valorConsultaCentavos: _valor,
    periodicidade: _periodicidade,
    diaSemanaConsulta: _dia,
    ...corpo
  } = dados;
  const resposta = await fetch("/api/auto-cadastro/pacientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo satisfies DadosAutoCadastro),
  });
  if (resposta.status === 409) throw new CpfJaCadastradoError();
  if (!resposta.ok) {
    throw new Error(
      `Auto-cadastro recusado pelo servidor (${resposta.status})`,
    );
  }
}

export async function salvarFotoAutoCadastro(arquivo: Blob): Promise<string> {
  const resposta = await fetch("/api/auto-cadastro/fotos", {
    method: "POST",
    body: arquivo,
  });
  if (!resposta.ok) {
    throw new Error(`Foto recusada pelo servidor (${resposta.status})`);
  }
  const { arquivo: nome } = (await resposta.json()) as { arquivo: string };
  return nome;
}
