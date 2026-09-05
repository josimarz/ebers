# Sistema de design do Ebers

Guia de implementação da interface do Ebers — o que os engenheiros e a
terapeuta veem na tela e por quê. Os tokens vivem em [`src/index.css`](../src/index.css);
as primitivas em [`src/components/ui/`](../src/components/ui/); os componentes de
apoio em [`src/components/`](../src/components/). Vocabulário do domínio:
[`CONTEXT.md`](../CONTEXT.md).

## 1. Contexto e objetivos

**Intenção, numa frase:** o Ebers é uma ferramenta de trabalho calma e nítida —
navegação e sobreposições em vidro fosco flutuando sobre um fundo luminoso e
suave; o conteúdo em cartões de vidro leve, texto de alto contraste, uma única
cor de ação e cores só para estado.

O estilo é *glassmorphism* (efeito de vidro líquido): camadas translúcidas,
desfoque do que está atrás, bordas luminosas. Ele serve a três objetivos, nesta
ordem:

1. **Legibilidade** — a terapeuta lê nomes, horários e textos clínicos o dia
   inteiro; todo texto passa WCAG 2.2 AA (≥ 4,5:1).
2. **Hierarquia** — o que é navegação (menu, cabeçalho, modal) flutua acima do
   que é conteúdo (cartões, tabelas, formulários).
3. **Consistência** — um mesmo padrão para cada situação (uma superfície por
   camada, um botão por papel, um badge por estado).

Público: uma única usuária (a Terapeuta), num Mac, mais o Paciente no tablet
durante o Auto-cadastro. Sem modo escuro ligado hoje (ver §8).

## 2. Tokens e fundações

Todos os valores são tokens semânticos em OKLCH (`src/index.css`). Regra: **use
o token, nunca o valor cru**; se falta token, crie o token.

### 2.1 Cor

| Papel | Token | Valor (claro) | Uso |
|---|---|---|---|
| Ação | `--primary` | `oklch(0.54 0.25 264)` (#1856FF) | Botão principal, item ativo do menu, foco |
| Texto | `--foreground` | `oklch(0.2 0.015 295)` | Todo texto corrente |
| Apoio | `--muted-foreground` | `oklch(0.45 0.035 295)` | Descrições, cabeçalhos de tabela, "—" |
| Realce | `--accent` / `--accent-foreground` | `oklch(0.93 0.04 264)` / `oklch(0.4 0.2 264)` | Tinta azul de badge "Aberta", avatar neutro, hover de opção |
| Sucesso | `--success` / `--success-subtle` | `oklch(0.46 0.15 153)` / `oklch(0.95 0.04 153)` | Timer verde, badge "Finalizada", confirmação |
| Atenção | `--warning` / `--warning-subtle` | `oklch(0.49 0.14 56)` / `oklch(0.95 0.04 65)` | Timer amarelo |
| Perigo | `--destructive` / `--destructive-subtle` | `oklch(0.48 0.21 20)` / `oklch(0.95 0.03 20)` | Timer vermelho, erros, botão destrutivo, pendência |
| Contorno de campo | `--input` | `oklch(0.62 0.015 295)` | Borda de input/select (3:1 sobre o cartão) |
| Divisória | `--border` | `oklch(0.86 0.012 295)` | Linhas de tabela, separadores |
| Véu | `--veu` | `oklch(0.15 0.02 295 / 32%)` | Atrás das modais |

Os matizes de `success`, `warning` e `destructive` são os da paleta da marca
(#07CA6B, #E89558, #EA2143) com a **luminosidade abaixada**: as cores
originais dão 2,2–4,4:1 como texto e reprovariam AA. Por isso existe o par
`*-subtle` (tinta opaca clara): texto do estado sobre a própria tinta fica em
5,6–5,9:1 esteja o elemento sobre o pano, sobre um cartão ou sobre o vidro
fosco. Tintas translúcidas (`bg-destructive/10`) são só para **fundo de linha**
de tabela, onde o texto é `--foreground`.

`--chart-1..5` apontam para os tokens de estado; o timer da Consulta usa
`text-success` / `text-warning` / `text-destructive`, nunca `chart-*`.

### 2.2 Tipografia

- **Texto e títulos:** Plus Jakarta Sans (variável, 200–800), via
  `@fontsource-variable/plus-jakarta-sans` — empacotada no app, sem rede.
- **Mono:** JetBrains Mono (variável) — só onde alinhamento importa: o timer
  da Consulta e a tecla `⌘B` do menu.
- Escala: `text-2xl` bold (título da página, `tracking-tight`), `text-lg`
  semibold (seção de formulário), `text-base` (título de modal), `text-sm`
  (corpo de tabela, campos, botões), `text-xs` (cabeçalhos de tabela em
  versalete `uppercase tracking-wide`, dicas, rodapé).
- `tabular-nums` em toda tabela e no timer.

### 2.3 Espaçamento e raio

Densidade confortável: `gap-6` entre blocos de página, `p-6` dentro de
cartões, `gap-4` entre campos, células `px-3 py-2.5`, controles de `h-8`
(botão, campo). Raio base `--radius: 0.625rem`: `rounded-lg` em controles,
`rounded-xl` em campos compostos (timer, saldo), `rounded-2xl` em cartões,
menu, cabeçalho e modal, `rounded-full` em badges e avatares.

### 2.4 Superfícies de vidro

Exatamente duas camadas — utilities de verdade (`@utility`), aceitam variantes
e `@apply`:

| Camada | Utility | Onde | Composição |
|---|---|---|---|
| Página | `glass-bg` | Cartões, tabelas, seções de formulário, painéis da Consulta, estados vazios | branco 34–48%, blur 14px, borda branca 72%, fio de luz no topo |
| Sobreposição | `glass-frosted` | Menu lateral, cabeçalho, modal, lista do filtro, barra de ações do formulário | branco 66–78%, blur 28px, borda branca 85%, sombra maior |

Os tokens `--background`, `--card` e `--popover` são **transparentes de
propósito**: uma primitiva que pinte `bg-popover` não pinta nada — é a
utility de vidro que dá corpo. `--glass-fill` (branco 55%) é o preenchimento
leve de campos, linhas em hover, botões de contorno e chips.

Nunca empilhe vidro sobre vidro além de um nível (cartão dentro de modal usa
`bg-glass-fill` + `border-glass-border`, não `glass-bg`).

### 2.5 Pano de fundo

`<PanoDeFundo />` (`.pano-de-fundo`): base fria `oklch(0.965 0.01 268)` e três
luzes radiais suaves — azul da marca a 14% no alto à esquerda, violeta a 12% à
direita, menta a 14% embaixo. É o que o vidro desfoca. As intensidades são
limitadas por contraste: acima de ~15% o texto colorido cai abaixo de 4,5:1.

### 2.6 Movimento

Só com propósito: transições de cor/borda/sombra nos controles, entrada e saída
de modal (`tw-animate-css`), o ponto pulsante do microfone gravando. Sob
`prefers-reduced-motion: reduce` todas as animações e transições são zeradas
(regra global em `index.css`).

### 2.7 Ícone do app

O ícone de distribuição (Dock, Finder, `.dmg`) é o **Ψ** — psi, a letra da
psicologia — em branco sobre o azul da marca. O glifo é geométrico, em traço
único de ponta redonda (haste e taça com o mesmo peso), no espírito das formas
da Plus Jakarta Sans; o tile leva `--primary` em degradê (mais claro no alto,
mais fundo embaixo), as luzes violeta e menta do pano de fundo (§2.5) nos
cantos e o fio de luz na borda das superfícies de vidro (§2.4). O tile segue o
grid de ícones do macOS: squircle de 824 px com cantos contínuos num canvas
de 1024, com margem transparente — é o que alinha o Ebers aos vizinhos no
Dock.

Fonte: [`src-tauri/icons/icone.svg`](../src-tauri/icons/icone.svg). Os
PNG/ICNS/ICO ao lado são gerados por `mise run icone` (`tauri icon`) e não se
editam à mão.

## 3. Regras por componente

### 3.1 Moldura (`layout/layout-app.tsx`)

- Menu lateral `variant="floating"` + `collapsible="icon"`: cartão
  `glass-frosted rounded-2xl` a 8px das bordas; item ativo em
  `bg-sidebar-primary/10 text-sidebar-primary font-semibold`; hover em
  `--sidebar-accent` (vidro). Recolhido, só ícones com tooltip; `⌘B` alterna.
- Cabeçalho: cartão `glass-frosted` **grudado** (`sticky top-2`), com o
  gatilho do menu e a trilha `Ebers › Seção › Subpágina` (links até o
  penúltimo; o último é `BreadcrumbPage`).
- Um único `<main>` na página (o `SidebarInset` é `div`).
- Rodapé em `text-xs text-muted-foreground`, sem borda.
- Ação global do cabeçalho (`BotaoAutoCadastro`): à direita (`ml-auto`),
  `Button outline size="sm"` com ícone `QrCode` e o rótulo "Auto-cadastro" —
  abre a modal do QR code do Auto-cadastro. É a única ação da moldura; ações
  de página ficam no `CabecalhoPagina`. Não use botão flutuante para isso:
  ele cobriria a barra "Salvar" grudada dos formulários e a paginação das
  tabelas.

### 3.2 Cabeçalho de página (`CabecalhoPagina`)

`h1` (`text-2xl font-bold tracking-tight`) + uma linha de apoio na linguagem
do domínio + a ação principal à direita (`Button` default com ícone). Toda
página de seção usa o componente; formulários também (a descrição só no
tablet).

### 3.3 Botões (`ui/button.tsx`)

| Variante | Papel | Aparência |
|---|---|---|
| `default` | A ação principal da tela (uma por contexto) | `bg-primary`, fio de luz no topo, hover 90% |
| `outline` | Ações secundárias sobre vidro | `bg-glass-fill`, borda `--border`, hover escurece a borda para `--input` |
| `ghost` | Ícones, ordenação, barra de formatação | Só hover `bg-glass-fill` |
| `destructive` | Cancelar Consulta, desligar microfone | Suave: `bg-destructive-subtle text-destructive` |
| `link` | Não usar em ações | — |

Estados obrigatórios: hover, `focus-visible` (anel `ring-3 ring-ring/50`),
`active` (desce 1px), `disabled` (50% de opacidade, sem ponteiro),
`aria-invalid`. Ícone sempre antes do rótulo, `size-4`.

### 3.4 Campos (`ui/input.tsx`, `ui/textarea.tsx`, `ui/select-nativo.tsx`)

- `h-8`, `bg-glass-fill`, contorno `--input` (3:1 sobre o cartão), hover
  escurece o contorno, foco = contorno `--ring` + anel, erro = contorno e anel
  em `--destructive` + mensagem `text-sm text-destructive` ligada por
  `aria-describedby`.
- **Somente leitura** é o estado "não se aplica agora" dos campos
  condicionais: fica na tela, no mesmo lugar, com contorno `--border`, fundo
  `muted/40` e texto apagado. Nunca esconda o campo.
- O select desliga a aparência do motor e desenha a própria seta (CSS em
  `[data-slot="select-nativo"]`); a lista aberta continua nativa. As classes
  do select **não** incluem `read-only:` — `:read-only` casa com todo
  `<select>`.
- O textarea (texto livre multilinha, como o Motivo da terapia) usa as
  mesmas classes do input — a única exceção ao `h-8`: `min-h-28`, esticável
  na vertical (`resize-y`), `py-2 leading-relaxed`.
- Rótulo `text-sm font-medium`; asterisco vermelho fora do `<label>`. Dica
  `text-xs text-muted-foreground` abaixo do campo, ligada ao controle por
  `aria-describedby` junto com o erro.

### 3.5 Tabelas (`ui/table.tsx`)

- Container `glass-bg overflow-hidden rounded-2xl`.
- Cabeçalho em versalete apagado (`text-xs font-semibold uppercase
  tracking-wide text-muted-foreground`, `h-11`); coluna ordenável usa o mesmo
  estilo num `Button ghost`, com `aria-sort` no `th` e a coluna ativa em
  `text-foreground`.
- Linha: divisória `border-border/60`, hover `bg-glass-fill`; linha clicável
  tem `tabIndex=0`, Enter abre, e anel de foco por dentro (`ring-inset`).
- Valores ausentes ("—", "Não", saldo 0) em `text-muted-foreground`; saldo de
  Créditos positivo em `Badge secondary` (`SaldoCreditos`).
- Pendência financeira (spec 3.1): linha `bg-destructive/10`.

### 3.6 Badges (`ui/badge.tsx`, `StatusConsulta`)

Pílula `text-xs font-medium` com tinta opaca e texto na cor do estado.
Status da Consulta: **Aberta** = `default` (azul), **Finalizada** = `success`,
**Cancelada** = `secondary` (neutra). Só texto dentro — o leitor de tela e as
listagens leem o mesmo.

### 3.7 Avisos e estados

- Erro de carga ou de ação da página: `AvisoErro` (`role="alert"`,
  `bg-destructive-subtle`, ícone). Erro de campo: texto vermelho sob o campo.
- Carregando: `text-sm text-muted-foreground` com reticências ("Carregando
  pacientes…").
- Vazio: `EstadoVazio` — cartão de vidro, ícone em círculo `bg-accent`,
  título `font-medium`, apoio apagado. Ícone diz o motivo (`Users`,
  `NotebookPen`, `SearchX`).

### 3.8 Modal e listas flutuantes (`ui/dialog.tsx`, `FiltroPaciente`)

Painel `glass-frosted rounded-2xl p-6`; véu `bg-veu` com blur. Véu e painel
são um par (o painel desfoca o véu): mexer no alfa de um muda o outro. A lista
do filtro é `glass-frosted rounded-xl p-1` com opções `rounded-lg` e estados
hover/focus/`aria-selected` em `bg-accent`.

A modal do QR code (`ModalAutoCadastro`, `sm:max-w-md`) é a única exceção à
regra dos tokens: o QR é preto sobre branco dentro do próprio SVG, com zona de
silêncio de 2 módulos — exigência da leitura pela câmera, não uma superfície
do tema. Em volta dele, `rounded-xl border-glass-border`; o endereço por
extenso vai em `font-mono text-sm text-muted-foreground`; os erros usam
`AvisoErro` seguido de um `Button outline` "Tentar de novo".

### 3.9 Painéis da Consulta (`PainelConsulta`)

Conteúdo e Notas são dois cartões iguais: cabeçalho (título = `<label>` do
campo, apoio, controle opcional como o microfone), corpo = o campo, sem borda
própria; o anel de foco é do cartão (`focus-within:outline-2`). Cancelada
deixa o cartão a 80% e o campo somente leitura. Timer: chip `font-mono
text-2xl` em `bg-glass-fill`, cor pela faixa.

### 3.10 Responsivo e casos-limite

- Janela mínima do app: 900×600. A grade dos formulários e dos painéis cai
  para uma coluna abaixo de `md`; a barra de formatação das Notas quebra linha.
- Nome longo no cabeçalho da Consulta trunca (`truncate`); nas tabelas as
  células não quebram (`whitespace-nowrap`) e o container rola na horizontal.
- Tabelas com muitas ações mantêm os botões `size="sm"` numa linha.

## 4. Acessibilidade — critérios de aceite

Cada item é verificável em código ou com o inspetor:

1. Texto corrente ≥ 4,5:1 e texto grande ≥ 3:1 sobre **pano, cartão e
   vidro fosco** — `npm run contraste` (`scripts/contraste.mjs`) mede todos os
   pares a partir dos tokens e falha abaixo da meta.
2. Contorno de campo ≥ 3:1 sobre o cartão (`--input`); foco visível em todo
   controle (`focus-visible:ring-3` ou `outline-2`), nunca removido.
3. Tudo opera por teclado: menu (`⌘B`), linhas clicáveis (Tab + Enter),
   filtro com autocomplete (`role="combobox"`/`listbox`/`option`), modal
   (foco preso, Esc fecha, botão "Fechar" com `sr-only`).
4. Nomes acessíveis sem ruído: ícones decorativos com `aria-hidden`;
   asterisco fora do `<label>`; `aria-sort` em colunas ordenáveis;
   `role="timer"` no relógio; `role="alert"` em erros de página.
5. Um `<main>` por página; `<nav aria-label="Menu principal">` e
   `<nav aria-label="Trilha de navegação">`.
6. `prefers-reduced-motion` zera animações e transições.
7. Estado nunca é comunicado só por cor: badge tem texto, timer tem
   número, pendência tem os números de feitas/pagas ao lado.

## 5. Conteúdo e tom

Conciso, confiante, claro e cordial — na linguagem de `CONTEXT.md`
(Paciente, Consulta, Créditos, Responsável legal; nunca "sessão", "cliente",
"pacote").

- Títulos de página: o substantivo da seção ("Pacientes"). Botões: verbo +
  objeto ("Nova Consulta", "Efetuar Pagamento"), sem reticências.
- Apoio de página: uma frase, sem ponto de exclamação
  ("O cadastro de cada paciente e a porta de entrada da Consulta.").
- Erros dizem o que não deu e, se houver, o que fazer
  ("Não foi possível salvar. Tente de novo.", "CPF já cadastrado — chame a
  terapeuta").
- Vazios: título com o fato, apoio com a consequência ("Nenhum paciente
  cadastrado" / "Os pacientes cadastrados aparecerão aqui.").
- Números com `tabular-nums`; datas `dd/mm/aaaa`; dinheiro "R$ 250,00".

## 6. Anti-padrões (não faça)

- Cor crua (`#1856FF`, `bg-white`, `text-gray-500`) no lugar de token.
- `bg-popover`/`bg-card`/`bg-background` como fundo de uma superfície —
  neste tema é transparente; use `glass-bg`/`glass-frosted`/`glass-fill`.
- Texto em `text-primary`/`text-success`/... sobre tinta **translúcida**
  fora de um cartão (cai abaixo de 4,5:1); use a tinta `*-subtle`.
- Dois botões `default` lado a lado; botão destrutivo chapado.
- Esconder um campo condicional (ele fica somente leitura, no lugar).
- Vidro sobre vidro além de um nível; blur em elemento grande que rola.
- Animação decorativa (brilho, flutuação) ou `transition-all` em listas
  longas.
- Título de tabela com ícone sem `aria-hidden`; linha clicável sem
  `tabIndex`.
- Duas metáforas ao mesmo tempo (cartão chapado com sombra dura ao lado de
  vidro).
- Botão flutuante no canto da tela: cobre a barra "Salvar" grudada e a
  paginação; ação global vai ao cabeçalho (§3.1).

## 7. Checklist de QA (revisão de código)

- [ ] Nenhum valor cru de cor/fonte/raio; tudo via token ou utility do tema.
- [ ] Superfície nova usa `glass-bg` (página) ou `glass-frosted`
      (sobreposição) — nunca `bg-popover`/`bg-card`.
- [ ] Texto colorido só sobre `*-subtle`, `accent` ou cartão; medido ≥ 4,5:1.
- [ ] Controle novo tem hover, focus-visible, disabled (e error, se campo).
- [ ] Campo condicional continua na tela em somente leitura.
- [ ] Tabela: cabeçalho versalete, `tabular-nums`, hover `bg-glass-fill`,
      linha clicável focável.
- [ ] Estado (status, saldo, pendência) tem texto, não só cor.
- [ ] Vazio/erro/carregando usam `EstadoVazio` / `AvisoErro` / linha apagada.
- [ ] Ícone decorativo com `aria-hidden`; nome acessível dos botões é só o
      rótulo.
- [ ] Página cabe em 900×600 sem rolagem horizontal do corpo.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test:run` e `npm run contraste`
      verdes.

## 8. Notas de migração e pendências

- **Modo escuro:** os tokens `.dark` estão calibrados (pano, vidro, estados)
  mas nada aplica a classe. Ligar via `prefers-color-scheme` exige conferir
  cada tela — fica como próximo passo.
- **Firefox em `npm run dev`:** o Lightning CSS mantém só
  `-webkit-backdrop-filter`; sem efeito no produto (WKWebView).
- **Gaveta móvel do menu** (`SheetContent`) continua chapada em `bg-sidebar`,
  inalcançável no app (largura mínima 900 > breakpoint 768).
- Ao criar uma variante nova de qualquer componente, registre-a aqui na
  tabela do componente.
