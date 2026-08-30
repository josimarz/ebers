import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FiltroPaciente } from "./filtro-paciente";

const pacientes = [
  { id: 1, nomeCompleto: "Ana Lima" },
  { id: 2, nomeCompleto: "Bruno Castro" },
];

/**
 * Clique de mouse como o WebKit (Safari e o WKWebView do app) o entrega: no
 * macOS um <button> não recebe foco ao ser clicado, então o mousedown tira o
 * foco do campo com `relatedTarget` nulo — antes de o click chegar ao botão.
 * Se o componente cancelar o mousedown (preventDefault), o foco não sai e o
 * blur não acontece, como no navegador de verdade.
 */
function clicarComoNoWebKit(opcao: HTMLElement, campo: HTMLElement) {
  const focoSairia = fireEvent.mouseDown(opcao);
  if (focoSairia) fireEvent.blur(campo, { relatedTarget: null });
  fireEvent.click(opcao);
}

test("selecionar uma opção com o mouse aplica o filtro também no WebKit, onde o botão não recebe foco", () => {
  const aoSelecionar = vi.fn();
  render(
    <FiltroPaciente
      pacientes={pacientes}
      selecionado={null}
      aoSelecionar={aoSelecionar}
    />,
  );
  const campo = screen.getByRole("combobox", { name: "Filtrar por paciente" });
  fireEvent.focus(campo);

  clicarComoNoWebKit(
    screen.getByRole("option", { name: "Bruno Castro" }),
    campo,
  );

  expect(aoSelecionar).toHaveBeenCalledWith(2);
  expect(campo).toHaveValue("Bruno Castro");
});
