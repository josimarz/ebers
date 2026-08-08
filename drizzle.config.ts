import { defineConfig } from "drizzle-kit";

// As migrações geradas são aplicadas pelo backend Rust na inicialização
// (tauri-plugin-sql) — por isso vivem em src-tauri/migrations.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src-tauri/migrations",
});
