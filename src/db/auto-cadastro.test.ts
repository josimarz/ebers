import { beforeEach, expect, test, vi } from "vitest";
import {
  fetchFalso,
  programarResposta,
  reiniciarFetchFalso,
  requisicoesHttp,
} from "@/testes/fetch-falso";
import { dadosPacienteValidos } from "@/testes/fixtures-paciente";
import {
  criarPacienteAutoCadastro,
  salvarFotoAutoCadastro,
} from "./auto-cadastro";
import { CpfJaCadastradoError } from "./pacientes";

// Fronteira do sistema no Modo tablet: as rotas REST do servidor local
// (src-tauri/src/servidor.rs), atrás do fetch.
vi.stubGlobal("fetch", fetchFalso);

beforeEach(() => {
  reiniciarFetchFalso();
});

test("cadastro vai por POST sem os campos que o tablet oculta", async () => {
  programarResposta(201);

  await criarPacienteAutoCadastro(dadosPacienteValidos());

  expect(requisicoesHttp).toHaveLength(1);
  const [requisicao] = requisicoesHttp;
  expect(requisicao.url).toBe("/api/auto-cadastro/pacientes");
  expect(requisicao.metodo).toBe("POST");
  const corpo = JSON.parse(String(requisicao.corpo));
  expect(corpo.nomeCompleto).toBe("Ana Lima");
  expect(corpo.cpf).toBe("52998224725");
  // O Valor da consulta é aplicado pelo servidor (valor padrão); os campos
  // ocultos no tablet nem viajam — a rota os recusaria.
  expect(corpo).not.toHaveProperty("valorConsultaCentavos");
  expect(corpo).not.toHaveProperty("periodicidade");
  expect(corpo).not.toHaveProperty("diaSemanaConsulta");
});

test("CPF já cadastrado (409) vira CpfJaCadastradoError e nada mais é tentado", async () => {
  programarResposta(409);

  await expect(
    criarPacienteAutoCadastro(dadosPacienteValidos()),
  ).rejects.toBeInstanceOf(CpfJaCadastradoError);
  expect(requisicoesHttp).toHaveLength(1);
});

test("resposta inesperada do servidor vira erro comum", async () => {
  programarResposta(500);

  const tentativa = criarPacienteAutoCadastro(dadosPacienteValidos());

  await expect(tentativa).rejects.toBeInstanceOf(Error);
  await expect(tentativa).rejects.not.toBeInstanceOf(CpfJaCadastradoError);
});

test("foto vai por POST e volta como o nome do arquivo gravado", async () => {
  programarResposta(201, { arquivo: "foto-123.jpg" });
  const imagem = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

  const arquivo = await salvarFotoAutoCadastro(imagem);

  expect(arquivo).toBe("foto-123.jpg");
  expect(requisicoesHttp).toHaveLength(1);
  const [requisicao] = requisicoesHttp;
  expect(requisicao.url).toBe("/api/auto-cadastro/fotos");
  expect(requisicao.metodo).toBe("POST");
  expect(requisicao.corpo).toBe(imagem);
});

test("foto recusada pelo servidor vira erro", async () => {
  programarResposta(422);

  await expect(
    salvarFotoAutoCadastro(new Blob([new Uint8Array([1])])),
  ).rejects.toBeInstanceOf(Error);
});
