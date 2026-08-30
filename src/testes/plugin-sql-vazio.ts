// Dublê do @tauri-apps/plugin-sql com banco vazio, para vi.mock:
//   vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-vazio"));
export default {
  load: async () => ({
    select: async () => [],
    execute: async () => ({ rowsAffected: 0 }),
  }),
};
