import { NotebookPen, Users, Wallet } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { LayoutApp } from "@/layout/layout-app";
import { PaginaConsultas } from "@/paginas/consultas";
import { PaginaFinanceiro } from "@/paginas/financeiro";
import { PaginaFormularioPaciente } from "@/paginas/paciente-formulario";
import { PaginaPacientes } from "@/paginas/pacientes";

export interface Secao {
  caminho: string;
  titulo: string;
  icone: ComponentType<{ className?: string }>;
  elemento: ReactNode;
}

/** Seções do app: alimentam o menu da sidebar, o breadcrumb e as rotas. */
export const secoes: Secao[] = [
  {
    caminho: "/pacientes",
    titulo: "Pacientes",
    icone: Users,
    elemento: <PaginaPacientes />,
  },
  {
    caminho: "/consultas",
    titulo: "Consultas",
    icone: NotebookPen,
    elemento: <PaginaConsultas />,
  },
  {
    caminho: "/financeiro",
    titulo: "Financeiro",
    icone: Wallet,
    elemento: <PaginaFinanceiro />,
  },
];

export function Rotas() {
  return (
    <Routes>
      <Route element={<LayoutApp />}>
        <Route index element={<Navigate to="/pacientes" replace />} />
        {secoes.map((secao) => (
          <Route
            key={secao.caminho}
            path={secao.caminho}
            element={secao.elemento}
          />
        ))}
        <Route path="/pacientes/novo" element={<PaginaFormularioPaciente />} />
        <Route
          path="/pacientes/:id/editar"
          element={<PaginaFormularioPaciente />}
        />
      </Route>
    </Routes>
  );
}
