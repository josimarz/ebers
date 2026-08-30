import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import {
  programarComando,
  programarErroDeComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
import { ModalAutoCadastro } from "./modal-auto-cadastro";

// Fronteira do sistema: o comando Tauri que descobre o endereço do servidor
// local (src-tauri/src/endereco.rs). A modal roda de verdade sobre o dublê.
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

beforeEach(reiniciarComandosFalsos);

const URL_DO_TABLET = "http://192.168.0.10:8738";

function renderizarModal(aoFechar = vi.fn()) {
  render(<ModalAutoCadastro aoFechar={aoFechar} />);
  return aoFechar;
}

test("com o servidor no ar, mostra o QR code, o endereço em texto e os passos", async () => {
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: URL_DO_TABLET,
  });
  renderizarModal();

  expect(await screen.findByText(URL_DO_TABLET)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Auto-cadastro no tablet" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "QR code do endereço do Auto-cadastro" }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("listitem").map((passo) => passo.textContent),
  ).toEqual([
    "O tablet precisa estar no Wi-Fi do consultório.",
    "Toque no link que aparece na câmera.",
    "Salve a página nos favoritos: o endereço vale enquanto o Ebers estiver aberto. Se um dia o favorito parar de abrir, leia o código de novo.",
  ]);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("servidor fora do ar: aviso, e Tentar de novo consulta o endereço outra vez", async () => {
  programarComando("endereco_auto_cadastro", { estado: "fora-do-ar" });
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: URL_DO_TABLET,
  });
  renderizarModal();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "O Auto-cadastro não está no ar. Feche e abra o Ebers de novo.",
  );
  expect(
    screen.queryByRole("img", { name: "QR code do endereço do Auto-cadastro" }),
  ).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

  expect(await screen.findByText(URL_DO_TABLET)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("sem rede: aviso para conectar o computador ao Wi-Fi do consultório", async () => {
  programarComando("endereco_auto_cadastro", { estado: "sem-rede" });
  renderizarModal();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Este computador não está conectado a nenhuma rede. Conecte-o ao Wi-Fi do consultório.",
  );
  expect(
    screen.getByRole("button", { name: "Tentar de novo" }),
  ).toBeInTheDocument();
});

test("falha ao consultar o endereço: aviso genérico com Tentar de novo", async () => {
  programarErroDeComando("endereco_auto_cadastro", new Error("ipc"));
  renderizarModal();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível obter o endereço. Tente de novo.",
  );
  expect(
    screen.getByRole("button", { name: "Tentar de novo" }),
  ).toBeInTheDocument();
});

test("fechar a modal avisa quem a abriu", async () => {
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: URL_DO_TABLET,
  });
  const aoFechar = renderizarModal();
  await screen.findByText(URL_DO_TABLET);

  await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

  expect(aoFechar).toHaveBeenCalled();
});
