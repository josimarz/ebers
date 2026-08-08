# Produto: Ebers

Sistema web de gerenciamento de pacientes e consultas para consultório de psicologia.

## Regra global

- Toda a interface deve ser em **português brasileiro (pt-BR)**.

---

## 1. Entidade: Paciente

### 1.1 Campos do paciente

| Campo | Tipo | Obrigatório | Opções / Detalhes |
|---|---|---|---|
| Nome completo | texto | Sim | — |
| Foto de perfil | imagem | Não | — |
| Data de nascimento | data | Sim | — |
| Gênero | enum | Sim | Masculino, Feminino, Não binário |
| CPF | texto | Sim | — |
| RG | texto | Não | — |
| Religião | enum | Sim | Ateu, Budismo, Candomblé, Católica, Espírita, Espiritualista, Evangélica, Hinduísmo, Islamismo, Judaísmo, Mórmon, Sem religião, Testemunha de Jeová, Umbanda |
| Responsável legal | texto | Condicional | Obrigatório se o paciente for menor de 18 anos (ver regra abaixo) |
| Email do responsável legal | email | Condicional | Obrigatório se o paciente for menor de 18 anos |
| CPF do responsável legal | texto | Condicional | Obrigatório se o paciente for menor de 18 anos |
| Telefone 1 | texto | Sim | — |
| Telefone 2 | texto | Não | — |
| Email | email | Não | — |
| Já fez terapia? | enum | Sim | Sim, Não |
| Quando fez terapia? | texto | Condicional | Obrigatório se "Já fez terapia?" = Sim |
| Toma algum medicamento? | enum | Sim | Sim, Não |
| Toma medicamento desde quando? | texto | Condicional | Obrigatório se "Toma algum medicamento?" = Sim |
| Nomes dos medicamentos | texto | Condicional | Obrigatório se "Toma algum medicamento?" = Sim |
| Já foi hospitalizado por questões psicológicas? | enum | Sim | Sim, Não |
| Quando foi hospitalizado? | texto | Condicional | Obrigatório se "Já foi hospitalizado?" = Sim |
| Razão da hospitalização | texto | Condicional | Obrigatório se "Já foi hospitalizado?" = Sim |
| Valor da consulta | decimal | Não | Acordado entre terapeuta e paciente |
| Periodicidade da consulta | enum | Não | Semanal, Quinzenal, Mensal, Esporádica |
| Dia da semana da consulta | enum | Não | — |
| Créditos | inteiro | — | Gerenciado exclusivamente pela funcionalidade de venda de créditos (seção 4.2). 1 crédito é debitado no momento da **criação** de cada consulta (não na finalização). |

#### Regra: Responsável legal para pacientes menores de 18 anos

- A idade é calculada a partir da Data de nascimento.
- Se o paciente for **menor de 18 anos**: os campos "Responsável legal", "Email do responsável legal" e "CPF do responsável legal" tornam-se **obrigatórios** (os três juntos).
- Se o paciente tiver **18 anos ou mais**: os três campos permanecem **totalmente opcionais**.
- A validação é reativa: assim que a Data de nascimento é preenchida, a interface reage imediatamente (exibindo/exigindo os campos se a idade calculada for menor que 18). Aplica-se tanto no modo desktop quanto no modo tablet (auto-cadastro).

### 1.2 Listagem de pacientes

Página com tabela paginada (10 por página) de todos os pacientes cadastrados.

**Colunas da tabela:**

| Coluna | Conteúdo |
|---|---|
| *(sem label)* | Foto de perfil (redonda, pequena) |
| Nome | Nome completo |
| Idade | Calculada a partir da data de nascimento |
| Telefone | Telefone 1 |
| Periodicidade | Periodicidade da consulta |
| Dia da semana | Dia da semana da consulta |
| Créditos | Total de créditos disponíveis |
| Ações | Botão "Editar" + botão de consulta (ver regra abaixo) |

**Regras da coluna Ações:**

- Se o paciente **não** possui consulta em aberto → exibir botão **"Nova Consulta"**.
- Se o paciente **possui** consulta com status "Aberta" → exibir botão **"Consulta"** (redireciona para essa consulta). Nunca há mais de uma consulta "Aberta" por paciente simultaneamente (ver pré-condição na seção 2.2).

**Ordenação:** por Nome ou Idade (clicável nas colunas).

**Filtro:** por nome do paciente (campo de busca).

### 1.3 Formulário de cadastro/edição de paciente

Página responsiva para cadastro e edição de pacientes.

**Modo tablet (auto-cadastro pelo paciente):**

- Ao acessar o sistema via tablet (iPad ou qualquer outro), o usuário é redirecionado automaticamente para o formulário de novo paciente.
- O menu lateral (sidebar) fica **inacessível** — não é exibido nem pode ser aberto.
- Não é possível sair da tela de cadastro.
- Os seguintes campos ficam **ocultos**: Valor da consulta, Periodicidade da consulta, Dia da semana da consulta.

**Modo desktop (terapeuta):**

- Todos os campos e funcionalidades estão disponíveis.

---

## 2. Entidade: Consulta

### 2.1 Campos da consulta

| Campo | Tipo | Valor padrão | Detalhes |
|---|---|---|---|
| Iniciado em | data/hora | Data/hora de criação do registro | — |
| Finalizado em | data/hora | Nulo | Preenchido ao finalizar |
| Pago em | data/hora | Nulo (ou data/hora atual se paciente tem crédito) | — |
| Status | texto | "Aberta" | Valores possíveis: "Aberta", "Finalizada", "Cancelada" |
| Conteúdo | texto | Vazio | O que o paciente relata (texto plano) |
| Notas | HTML | Vazio | Anotações da terapeuta |
| Preço | decimal | Valor da consulta do paciente | — |
| Pago | booleano | `true` se paciente tem crédito, senão `false` | — |

### 2.2 Criação de nova consulta

Acionada pelo botão "Nova Consulta" na listagem de pacientes.

**Pré-condição:** o paciente não pode ter nenhuma consulta com status "Aberta".

**Regra de crédito na criação:**

1. Se o paciente tem créditos > 0:
   - `Pago` = `true`
   - `Pago em` = data/hora atual
   - Descontar 1 crédito do paciente
2. Se o paciente não tem créditos:
   - `Pago` = `false`
   - `Pago em` = nulo

### 2.3 Página da consulta

**Cabeçalho:**

- Foto do paciente
- Nome do paciente
- Idade do paciente
- Timer em tempo real
- Botão "Finalizar Consulta"
- Botão "Efetuar Pagamento"

**Timer (duração padrão: 1 hora):**

| Tempo restante | Cor |
|---|---|
| > 15 minutos | Verde |
| > 5 minutos e ≤ 15 minutos | Amarela |
| ≤ 5 minutos | Vermelha |

**Corpo — editor HTML + campo de texto lado a lado:**

1. **Conteúdo** — relato do paciente (campo de texto plano)
2. **Notas** — anotações da terapeuta (editor HTML)

**Microfone (transcrição de voz):**

- Botão para ligar/desligar o microfone.
- Enquanto o microfone estiver ligado, o áudio captado é transcrito automaticamente no campo **Conteúdo**.

**Funcionalidades do editor HTML (Notas):** negrito, itálico, sublinhado, riscado, cores básicas, tamanho de fonte, títulos (h1–h6).

**Ação "Finalizar Consulta":**

- Status → "Finalizada"
- `Finalizado em` → data/hora atual

**Ação "Efetuar Pagamento":**

- `Pago` → `true`
- `Pago em` → data/hora atual

**Ação "Cancelar Consulta":**

- Disponível apenas quando a consulta está com Status "Aberta" e não foi paga diretamente via "Efetuar Pagamento" (dinheiro recebido fora do sistema).
- Status → "Cancelada"
- O registro é preservado para histórico/auditoria — nunca excluído.
- Se `Pago = true` na consulta em razão de consumo de crédito, devolve 1 crédito ao paciente.

### 2.4 Listagem de consultas

Página com tabela de todas as consultas.

**Colunas:**

| Coluna | Conteúdo |
|---|---|
| *(sem label)* | Foto do paciente |
| Data | Data da consulta |
| Início | Horário de início |
| Fim | Horário de fim |
| Status | "Aberta", "Finalizada" ou "Cancelada" |
| Pago | Sim/Não |

Consultas canceladas aparecem normalmente na listagem, sem filtro ou ocultação especial.

**Filtro:** por paciente (dropdown com autocomplete).

**Ordenação padrão:** data decrescente (mais recente primeiro).

**Interação:** clicar na linha redireciona para a página da consulta.

---

## 3. Controle financeiro

### 3.1 Listagem de pacientes (financeiro)

Tabela com todos os pacientes e dados financeiros.

**Colunas:**

| Coluna | Conteúdo |
|---|---|
| *(sem label)* | Foto do paciente |
| Nome | Nome do paciente |
| Consultas feitas | Total de consultas do paciente |
| Consultas pagas | Total de consultas com `Pago = true` |
| Créditos | Total de créditos disponíveis |
| Ações | Botão "Listar consultas" + Botão "Acessar cadastro" + Botão "Vender créditos" |

**Regras:**

- Se `Consultas pagas < Consultas feitas` → destacar a linha em **vermelho**.
- Ordenação padrão: pacientes com maior diferença (`Consultas feitas - Consultas pagas`) no topo.
- Filtro: por paciente (dropdown com autocomplete).

### 3.2 Venda de créditos

Acionada pelo botão "Vender créditos" na listagem financeira.

**Pré-condição:** o paciente deve ter o campo "Valor da consulta" preenchido.

**Fluxo:**

1. Abre modal.
2. Terapeuta informa a quantidade de créditos.
3. Sistema exibe valor total = quantidade × valor da consulta do paciente.
4. Terapeuta confirma.
5. Créditos são adicionados ao saldo do paciente.

---

## 4. Layout e estilos

### 4.1 Estrutura do layout

- **Sidebar** (menu lateral à esquerda)
- **Cabeçalho**: breadcrumb
- **Corpo**: título da página + conteúdo
- **Rodapé**

### 4.2 Tema visual

- Utilizar o **tema padrão do [Glass UI](https://glass-ui.crenspire.com/themes)** (cores, tipografia e tokens fornecidos pela biblioteca).
- Não definir paleta de cores customizada — seguir o que o Glass UI entrega por padrão.
- Utilizar exclusivamente classes utilitárias do Tailwind com os tokens do tema (ex: `bg-primary`, `text-muted-foreground`, `border-border`). Não usar cores arbitrárias.

---

## 5. Stack Tecnológica

### Regras de ambiente

- Este sistema **não será hospedado em nuvem**.
- O sistema roda **localmente** na máquina da terapeuta.
- Pacientes acessam o sistema via **rede local** (computador ↔ iPad). **Este é um requisito forte por questões de segurança**.
- Usar **TDD** (Test-Driven Development) em todo o projeto.
- Usar o **MCP Context7** para consultar documentação atualizada das bibliotecas.

---

### 5.1 Framework de aplicação

**Sugestão inicial: Tauri 2**

| Item | Valor |
|---|---|
| Framework | Tauri 2 (última versão estável) |
| Backend | Rust |
| Frontend | React + TypeScript via Vite |
| Componentes UI | [Glass UI](https://glass-ui.crenspire.com/) (componentes shadcn/ui com estilo Liquid Glass) |
| Estilização | Tailwind CSS 4.1 |

**Ressalvas:**

- **Tauri é uma sugestão**, adotada porque Electron apresentou problemas de performance em avaliações anteriores.
- **Esta escolha não é definitiva** — o projeto deve permanecer aberto para avaliar outras possibilidades caso Tauri apresente limitações ou surjam alternativas mais adequadas.
- A decisão final deve considerar: performance, facilidade de implementação do servidor HTTP local, suporte à captura de áudio, e experiência de desenvolvimento.

#### Arquitetura (se Tauri for adotado)

- Toda lógica de acesso a banco de dados e sistema de arquivos deve residir no **backend Rust**.
- O frontend TypeScript comunica-se com o backend exclusivamente via **Tauri Commands** (`invoke`) quando executado dentro do app desktop (webview Tauri).
- O frontend é responsável apenas por **renderização de UI** e chamada de comandos.

#### Acesso via rede local (modo tablet)

O app desktop embute um **servidor HTTP local** (sugestão: Axum, no backend Rust) que serve a mesma SPA React na rede local, permitindo que o iPad (ou qualquer outro dispositivo) acesse o formulário de auto-cadastro via navegador comum — sem instalar nenhum app.

- O servidor expõe **rotas REST** equivalentes aos Tauri Commands para os fluxos usados no auto-cadastro, já que `invoke()` não está disponível fora do webview Tauri. A lógica de negócio pode ser duplicada entre o Command e a rota HTTP quando necessário.
- **Sem autenticação** — qualquer dispositivo na rede local do consultório acessa livremente. Decisão consciente, assumindo rede física confiável.
- O frontend detecta o contexto de execução via `window.__TAURI__` (presente = app desktop; ausente = navegador externo) para decidir se aplica o "modo tablet" (redireciona para cadastro, esconde a sidebar) — mesma SPA, sem bundle separado.

---

### 5.2 Banco de dados

**Sugestão: SQLite**

| Item | Valor |
|---|---|
| Banco | SQLite (última versão estável) |
| Plugin Tauri | `tauri-plugin-sql` (com feature `sqlite`) |
| ORM (frontend) | Drizzle ORM (modo SQLite proxy) |

**Justificativa:**

- **SQLite é sugerido pela simplicidade de implementação em ambientes locais** — arquivo único, sem servidor separado, zero configuração de rede.
- Adequado para o volume de dados esperado em um consultório individual.
- Facilita backup (copiar arquivo único) e portabilidade.

#### Por que Drizzle ORM

- **Type-safety completa** no TypeScript — schemas definem tipos que propagam para queries e resultados.
- **Modo proxy** permite usar o `tauri-plugin-sql` como driver, mantendo o SQLite no backend Rust.
- **Leve** — sem code generation, sem engine separada, bundle mínimo.
- **API próxima do SQL** — curva de aprendizado baixa, controle total sobre queries.
- **Migrations** via `drizzle-kit` — geração automática de SQL a partir do schema.

#### Padrão de comunicação

```
[Frontend: Drizzle ORM (proxy)] → invoke() → [Backend: tauri-plugin-sql] → [SQLite]
```

O Drizzle gera as queries SQL e as envia ao backend Rust via `invoke`. O `tauri-plugin-sql` executa as queries no SQLite e retorna os resultados.

---

### 5.3 Transcrição de áudio: Whisper (offline)

| Item | Valor |
|---|---|
| Modelo | OpenAI Whisper (via whisper.cpp) |
| Crate Rust | `whisper-rs` |
| Execução | 100% local/offline |
| Idioma | pt-BR |

#### Por que Whisper

- **Offline** — o áudio nunca sai da máquina, alinhado com a regra de não usar nuvem e com o requisito de rede local.
- **Suporte a pt-BR** — treinado em múltiplos idiomas com boa qualidade em português.
- **Integração nativa com Rust** — `whisper-rs` fornece bindings para `whisper.cpp`, rodando no backend Tauri.
- **Modelos escaláveis** — `tiny`, `base`, `small` para diferentes trade-offs de qualidade vs performance.

#### Padrão de comunicação

```
[Frontend: captura áudio (Web Audio API)] → invoke("transcribe_audio", { audioData }) → [Backend Rust: whisper-rs] → texto transcrito
```

O frontend captura o áudio do microfone, envia ao backend Rust via `invoke`, e o `whisper-rs` processa e retorna o texto transcrito para inserção no campo Conteúdo.

---

### 5.4 Linting e formatação: Biome

| Item | Valor |
|---|---|
| Ferramenta | [Biome](https://biomejs.dev/) |
| Escopo | Linting + formatação de TypeScript, JSX e JSON |

- Substituir ESLint e Prettier por **Biome** como ferramenta única de lint e formatação no frontend.
- Configurar via `biome.json` na raiz do projeto.

---

### 5.5 Tooling: mise

| Item | Valor |
|---|---|
| Ferramenta | [mise](https://mise.jdx.dev/) |
| Função | Gerenciamento de versões de ferramentas (Node.js, Rust, etc.) e execução de tasks |

- Usar `mise` para garantir versões consistentes de Node.js, Rust e demais ferramentas do projeto.
- Configurar via `.mise.toml` na raiz do projeto.
