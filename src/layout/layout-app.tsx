import { NavLink, Outlet, useLocation } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
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
import { secoes } from "@/rotas";

function tituloDaSecaoAtual(caminho: string): string {
  const secao = secoes.find((s) => caminho.startsWith(s.caminho));
  return secao?.titulo ?? "Início";
}

export function LayoutApp() {
  const { pathname } = useLocation();

  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* Pano de fundo com o gradiente do tema, sobre o qual o vidro é desenhado */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 opacity-20 [background:var(--gradient)]"
        />

        <Sidebar collapsible="icon">
          <SidebarHeader>
            <span className="px-2 py-1 font-heading text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Ebers
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <nav aria-label="Menu principal">
                  <SidebarMenu>
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
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Ebers</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {tituloDaSecaoAtual(pathname)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>

          <footer className="border-t px-6 py-3 text-sm text-muted-foreground">
            Ebers — gerenciamento do consultório
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
