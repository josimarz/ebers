import { Link, NavLink, Outlet, useLocation } from "react-router";
import { MarcaEbers } from "@/components/marca-ebers";
import { PanoDeFundo } from "@/components/pano-de-fundo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type Secao, secoes } from "@/rotas";

/** Páginas abaixo das seções, para a trilha do cabeçalho. */
const SUBPAGINAS: [RegExp, string][] = [
  [/^\/pacientes\/novo$/, "Novo Paciente"],
  [/^\/pacientes\/\d+\/editar$/, "Editar Paciente"],
  [/^\/consultas\/\d+$/, "Consulta"],
];

interface Trilha {
  secao: Secao | undefined;
  subpagina: string | undefined;
}

function trilhaDoCaminho(caminho: string): Trilha {
  return {
    secao: secoes.find((secao) => caminho.startsWith(secao.caminho)),
    subpagina: SUBPAGINAS.find(([padrao]) => padrao.test(caminho))?.[1],
  };
}

/**
 * Moldura do Modo desktop (docs/design.md): menu lateral e cabeçalho são
 * cartões de vidro fosco flutuando sobre o pano de fundo; o conteúdo vive
 * abaixo do cabeçalho, em cartões de vidro leve.
 */
export function LayoutApp() {
  const { pathname } = useLocation();
  const { secao, subpagina } = trilhaDoCaminho(pathname);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <PanoDeFundo />

        <Sidebar collapsible="icon" variant="floating">
          <SidebarHeader className="p-3">
            <MarcaEbers classeDoNome="group-data-[collapsible=icon]:hidden" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <nav aria-label="Menu principal">
                  <SidebarMenu className="gap-1">
                    {secoes.map((secao) => (
                      <SidebarMenuItem key={secao.caminho}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(secao.caminho)}
                          tooltip={secao.titulo}
                        >
                          <NavLink to={secao.caminho}>
                            <secao.icone />
                            <span>{secao.titulo}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </nav>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded-md border border-border bg-glass-fill px-1.5 py-0.5 font-mono text-[11px]">
                ⌘B
              </kbd>{" "}
              recolhe o menu
            </p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="glass-frosted sticky top-2 z-20 mx-2 mt-2 flex h-12 shrink-0 items-center gap-2 rounded-2xl px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/pacientes">Ebers</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {secao && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {subpagina ? (
                        <BreadcrumbLink asChild>
                          <Link to={secao.caminho}>{secao.titulo}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{secao.titulo}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </>
                )}
                {subpagina && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{subpagina}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>

          <footer className="px-6 pt-2 pb-4 text-xs text-muted-foreground">
            Ebers — gerenciamento do consultório
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
