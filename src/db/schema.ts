import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Esquema mínimo do esqueleto. Os demais campos do Paciente (spec 1.1)
// chegam com o ticket de cadastro, via novas migrações do drizzle-kit.
export const pacientes = sqliteTable("pacientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nomeCompleto: text("nome_completo").notNull(),
});
