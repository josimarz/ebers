import { banco } from "./banco";
import { pacientes } from "./schema";

export type Paciente = typeof pacientes.$inferSelect;

export async function listarPacientes(): Promise<Paciente[]> {
  return banco.select().from(pacientes);
}
