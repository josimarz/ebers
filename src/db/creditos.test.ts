import { beforeEach, expect, test, vi } from "vitest";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { saldosDeCreditos } from "./creditos";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// creditos → drizzle (sqlite-proxy) roda de verdade sobre o dublê.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

beforeEach(reiniciarBancoFalso);

test("saldosDeCreditos deriva o saldo de cada paciente da soma do extrato", async () => {
  enfileirarSelect([
    { paciente_id: 1, saldo: 3 },
    { paciente_id: 2, saldo: 0 },
  ]);

  const saldos = await saldosDeCreditos();

  expect(saldos).toEqual(
    new Map([
      [1, 3],
      [2, 0],
    ]),
  );
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/sum/i);
  expect(chamadas[0].sql).toMatch(/group by/i);
});

test("sem movimento algum, o mapa de saldos fica vazio", async () => {
  enfileirarSelect([]);

  expect(await saldosDeCreditos()).toEqual(new Map());
});
