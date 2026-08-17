# Especificação: Ebers

Sistema de gerenciamento de pacientes e consultas para o consultório de psicologia de uma única terapeuta. Roda localmente na máquina da terapeuta — nada em nuvem.

- Vocabulário canônico: [`CONTEXT.md`](../CONTEXT.md) (glossário).
- Decisões de arquitetura: [`docs/adr/`](./adr/).

## Regras globais

- Toda a interface em **português brasileiro (pt-BR)**.
- **Usuária única**: a terapeuta. Sem login, sem perfis ([ADR-0003](./adr/0003-rede-local-sem-autenticacao.md)).
- **Nenhum dado clínico sai da máquina** ([ADR-0003](./adr/0003-rede-local-sem-autenticacao.md), [ADR-0004](./adr/0004-transcricao-offline-com-whisper.md)).

## Não-objetivos do v1

Escopo cortado de propósito — não são lacunas:

- **Agendamento**: não existe Consulta futura. A Consulta nasce no momento em que o atendimento começa. "Periodicidade da consulta" e "Dia da semana da consulta" no cadastro são informativos.
- **Multiusuário / autenticação**: uma terapeuta, um consultório.
- **Relatórios financeiros agregados** (faturamento por período etc.): o controle financeiro do v1 é por paciente.
- **Exclusão de Paciente**: regra de domínio, não ausência de feature — o prontuário é preservado permanentemente (o CFP exige guarda mínima de 5 anos). Sem botão de excluir e sem estado "inativo" no v1.
- **Edição de cadastro pelo tablet**: o Auto-cadastro só cria Pacientes, nunca edita.
- **Exportar backup pelo app**: candidato forte a v1.1; no v1 o backup é manual (ver Operação).

## Operação

- **Backup manual**: copiar o arquivo do banco SQLite e o diretório de fotos, com o app fechado. Procedimento documentado para a terapeuta em [`docs/operacao.md`](./operacao.md).
- **Pré-requisito de instalação**: criptografia de disco do sistema operacional ativa (FileVault no macOS, BitLocker no Windows) — [ADR-0005](./adr/0005-criptografia-em-repouso-delegada-ao-so.md).

---

## 1. Entidade: Paciente

### 1.1 Campos do paciente

| Campo | Tipo | Obrigatório | Opções / Detalhes |
|---|---|---|---|
| Nome completo | texto | Sim | — |
| Foto de perfil | imagem | Não | — |
| Data de nascimento | data | Sim | — |
| Gênero | enum | Sim | Masculino, Feminino, Não binário, Prefiro não informar |
| CPF | texto | Sim | Único no sistema; dígitos verificadores validados (ver regra abaixo) |
| RG | texto | Não | — |
| Religião | enum | Sim | Ateu, Budismo, Candomblé, Católica, Espírita, Espiritualista, Evangélica, Hinduísmo, Islamismo, Judaísmo, Mórmon, Sem religião, Testemunha de Jeová, Umbanda, Outra, Prefiro não informar |
| Responsável legal | texto | Condicional | Obrigatório se o paciente for menor de 18 anos (ver regra abaixo) |
| Email do responsável legal | email | Condicional | Obrigatório se o paciente for menor de 18 anos |
| CPF do responsável legal | texto | Condicional | Obrigatório se o paciente for menor de 18 anos |
| Telefone 1 | texto | Sim | Para paciente menor de idade, é o telefone do Responsável legal (convenção — sem campo próprio) |
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
| Valor da consulta | decimal | Sim | Acordado entre terapeuta e paciente (ver regra "Valor padrão" abaixo) |
| Periodicidade da consulta | enum | Não | Semanal, Quinzenal, Mensal, Esporádica — no máximo um atendimento por semana |
| Dia da semana da consulta | enum | Não | Segunda, Terça, Quarta, Quinta, Sexta, Sábado |
| Créditos | inteiro | — | Saldo **derivado** do extrato de Movimentos de crédito (seção 3.3) — nunca editado diretamente. 1 crédito é debitado na **criação** de cada consulta (não na finalização) |

#### Regra: Responsável legal para pacientes menores de 18 anos

- A idade é calculada a partir da Data de nascimento.
- Se o paciente for **menor de 18 anos**: os campos "Responsável legal", "Email do responsável legal" e "CPF do responsável legal" tornam-se **obrigatórios** (os três juntos).
- Se o paciente tiver **18 anos ou mais**: os três campos permanecem **totalmente opcionais**.
- A validação é reativa: assim que a Data de nascimento é preenchida, a interface reage imediatamente (exibindo/exigindo os campos se a idade calculada for menor que 18). Aplica-se tanto no modo desktop quanto no modo tablet (Auto-cadastro).

#### Regra: CPF único e válido

- Os dígitos verificadores do CPF são validados em qualquer cadastro (desktop e tablet).
- O CPF é **único** no sistema. No Auto-cadastro, um CPF já existente exibe **"CPF já cadastrado — chame a terapeuta"** e nada é criado ou alterado.

#### Regra: Valor padrão da consulta

- O valor padrão do consultório é **R$ 250,00** — fixo no v1 (constante; não há tela de configuração). Mudança do preço de tabela = mudança nesta spec e no código; pacientes existentes não são afetados, pois guardam o próprio Valor.
- No modo desktop, o campo nasce **pré-preenchido** com o valor padrão, editável pela terapeuta.
- No Auto-cadastro, o campo fica oculto e o paciente recebe o valor padrão automaticamente.

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
| Créditos | Saldo de créditos disponível |
| Ações | Botão "Editar" + botão de consulta (ver regra abaixo) |

**Regras da coluna Ações:**

- Se o paciente **não** possui Consulta Aberta → exibir botão **"Nova Consulta"**.
- Se o paciente **possui** Consulta Aberta → exibir botão **"Consulta"** (redireciona para essa consulta). Nunca há mais de uma Consulta Aberta por paciente simultaneamente (ver pré-condição na seção 2.2).

**Ordenação:** por Nome ou Idade (clicável nas colunas).

**Filtro:** busca por nome do paciente, ignorando acentos e diferenças de caixa.

### 1.3 Formulário de cadastro/edição de paciente

Página responsiva para cadastro e edição de pacientes.

**Campos condicionais (nos dois modos):**

- Os campos que dependem de uma pergunta clínica ("Quando fez terapia?", "Toma medicamento desde quando?", "Nomes dos medicamentos", "Quando foi hospitalizado?", "Razão da hospitalização") ficam **sempre visíveis**, agrupados logo abaixo da pergunta de que dependem. Nenhum campo aparece ou some conforme as respostas — o layout não se reorganiza.
- Enquanto a resposta não for "Sim", o campo dependente fica **somente leitura** e não obrigatório. Ao responder "Sim", torna-se editável e obrigatório.
- Trocar a resposta de volta para "Não" **limpa** os campos que dependiam dela: o que está na tela é exatamente o que será gravado.

**Máscara de CPF (nos dois modos):**

- Os dois campos de CPF (do paciente e do Responsável legal) aplicam a máscara **000.000.000-00 enquanto o usuário digita**, ignorando o que não é dígito e parando no 11º. No banco o CPF é gravado só com os dígitos.

**Modo tablet (Auto-cadastro pelo paciente):**

- Ao acessar o sistema via navegador na rede local (iPad ou qualquer outro dispositivo), o usuário é redirecionado automaticamente para o formulário de novo paciente.
- O menu lateral (sidebar) fica **inacessível** — não é exibido nem pode ser aberto.
- Não é possível sair da tela de cadastro.
- Os seguintes campos ficam **ocultos**: Valor da consulta, Periodicidade da consulta, Dia da semana da consulta.
- "Valor da consulta" recebe automaticamente o **valor padrão do consultório** (R$ 250,00).
- **Após o envio**: tela de confirmação ("Cadastro recebido!") e retorno ao formulário em branco, pronto para o próximo paciente.
- O Auto-cadastro **só cria** pacientes — nunca edita um cadastro existente.

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
| Preço | decimal | Valor da consulta do paciente | Congelado na criação (não muda se o Valor do paciente mudar depois) |
| Pago | booleano | `true` se paciente tem crédito, senão `false` | — |
| Origem do pagamento | enum | "Crédito" se pago por crédito na criação, senão nulo | Valores: "Crédito", "Direto". Preenchido sempre que `Pago = true`; nulo quando `Pago = false` |

### 2.2 Criação de nova consulta

Acionada pelo botão "Nova Consulta" na listagem de pacientes.

**Pré-condição:** o paciente não pode ter nenhuma Consulta Aberta.

**Regra de crédito na criação:**

1. Se o paciente tem saldo de créditos > 0:
   - `Pago` = `true`
   - `Pago em` = data/hora atual
   - `Origem do pagamento` = "Crédito"
   - Registrar Movimento de crédito **Consumo** (−1), referenciando a consulta
2. Se o paciente não tem créditos:
   - `Pago` = `false`
   - `Pago em` = nulo
   - `Origem do pagamento` = nulo

### 2.3 Página da consulta

**Cabeçalho:**

- Foto do paciente
- Nome do paciente
- Idade do paciente
- Timer em tempo real
- Ações contextuais conforme o status (ver tabela de editabilidade): "Finalizar Consulta", "Efetuar Pagamento", "Desfazer Pagamento", "Cancelar Consulta"

**Timer (duração fixa: 1 hora, não configurável no v1):**

| Tempo restante | Cor |
|---|---|
| > 15 minutos | Verde |
| > 5 minutos e ≤ 15 minutos | Amarela |
| ≤ 5 minutos | Vermelha |

- Ao zerar, o timer continua contando o tempo excedido, em vermelho. **Nenhuma ação automática** (não finaliza, não alarma).

**Corpo — editor HTML + campo de texto lado a lado:**

1. **Conteúdo** — relato do paciente (campo de texto plano)
2. **Notas** — anotações da terapeuta (editor HTML)

**Salvamento automático:** alterações em Conteúdo e Notas são persistidas automaticamente enquanto a terapeuta digita ou o microfone transcreve — não existe botão "Salvar". Uma queda do app não pode perder texto da sessão.

**Microfone (transcrição de voz):**

- Botão para ligar/desligar o microfone.
- Enquanto o microfone estiver ligado, o áudio captado é transcrito automaticamente no campo **Conteúdo**.

**Funcionalidades do editor HTML (Notas):** negrito, itálico, sublinhado, riscado, cores básicas, tamanho de fonte, títulos (h1–h6).

**Editabilidade e ações por status:**

| Status | Conteúdo / Notas | Ações disponíveis |
|---|---|---|
| Aberta | Editáveis (com microfone) | Finalizar Consulta; Efetuar Pagamento (se não paga); Desfazer Pagamento (se paga com Origem "Direto"); Cancelar Consulta (se não paga, ou paga com Origem "Crédito") |
| Finalizada | Editáveis (terapeuta completa anotações após a sessão) | Efetuar Pagamento (se não paga); Desfazer Pagamento (se paga com Origem "Direto") |
| Cancelada | Somente leitura | — |

Não existe "reabrir" uma consulta Finalizada — finalizar por engano é inofensivo porque Conteúdo/Notas continuam editáveis.

**Ação "Finalizar Consulta":**

- Status → "Finalizada"
- `Finalizado em` → data/hora atual

**Ação "Efetuar Pagamento"** (pagamento recebido fora do sistema — dinheiro, Pix):

- Disponível em consulta Aberta ou Finalizada com `Pago = false`.
- `Pago` → `true`; `Pago em` → data/hora atual; `Origem do pagamento` → "Direto".

**Ação "Desfazer Pagamento":**

- Disponível em consulta Aberta ou Finalizada com `Pago = true` e `Origem do pagamento = "Direto"` (pagamento por crédito não é desfeito — só devolvido via cancelamento).
- `Pago` → `false`; `Pago em` → nulo; `Origem do pagamento` → nulo.

**Ação "Cancelar Consulta":**

- Disponível apenas em consulta **Aberta** que esteja não paga ou paga com Origem "Crédito". Consulta paga com Origem "Direto" não pode ser cancelada — é preciso "Desfazer Pagamento" antes (a devolução do dinheiro acontece fora do sistema).
- Status → "Cancelada".
- Se estava paga por crédito: registrar Movimento de crédito **Estorno** (+1) referenciando a consulta; `Pago` → `false`; `Pago em` → nulo; `Origem do pagamento` → nulo. Consulta Cancelada nunca conta como paga.
- O registro é preservado para histórico/auditoria — nunca excluído.

### 2.4 Listagem de consultas

Página com tabela paginada (10 por página) de todas as consultas.

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

**Definições:**

- **Consultas feitas** = consultas **Finalizadas** do paciente. Abertas e Canceladas **não contam**.
- **Consultas pagas** = consultas Finalizadas com `Pago = true`.

**Colunas:**

| Coluna | Conteúdo |
|---|---|
| *(sem label)* | Foto do paciente |
| Nome | Nome do paciente |
| Consultas feitas | Conforme definição acima |
| Consultas pagas | Conforme definição acima |
| Créditos | Saldo de créditos disponível |
| Ações | Botão "Listar consultas" + Botão "Acessar cadastro" + Botão "Créditos" |

**Regras:**

- Se `Consultas pagas < Consultas feitas` → destacar a linha em **vermelho** (Pendência financeira).
- Ordenação padrão: pacientes com maior diferença (`Consultas feitas − Consultas pagas`) no topo.
- Filtro: por paciente (dropdown com autocomplete).

### 3.2 Créditos do paciente (modal "Créditos")

Acionado pelo botão "Créditos" na listagem financeira. Modal único com o saldo, o extrato e as duas ações:

- **Saldo** atual de créditos do paciente.
- **Extrato**: movimentos do mais recente para o mais antigo (data/hora, tipo, quantidade, consulta referenciada ou motivo). Sem paginação.
- **Vender**: terapeuta informa a quantidade; o sistema exibe valor total = quantidade × Valor da consulta do paciente; ao confirmar, registra Movimento **Venda** (+quantidade), gravando também o Valor da consulta vigente (informativo, para o extrato).
- **Ajustar**: quantidade positiva ou negativa + **motivo obrigatório**; registra Movimento **Ajuste**. Não pode deixar o saldo negativo.

### 3.3 Movimentos de crédito (extrato)

O saldo de Créditos de um paciente é **derivado** da soma dos seus movimentos — nunca editado diretamente e **nunca negativo**.

| Tipo | Quantidade | Quando | Referência |
|---|---|---|---|
| Venda | +N | Venda de créditos (3.2) | Valor unitário vigente (informativo) |
| Consumo | −1 | Criação de consulta com saldo > 0 (2.2) | A consulta |
| Estorno | +1 | Cancelamento de consulta paga por crédito (2.3) | A consulta |
| Ajuste | ±N | Correção manual pela terapeuta | **Motivo obrigatório** (texto livre) |

Cada movimento registra data/hora, tipo, quantidade e referência/motivo.

**Regra: crédito nunca quita consulta passada.** Crédito é pré-pagamento — vale apenas para consultas criadas depois. Dívida antiga é quitada via "Efetuar Pagamento" em cada consulta.

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

- Este sistema **não será hospedado em nuvem**. Roda **localmente** na máquina da terapeuta; pacientes acessam via **rede local** (computador ↔ iPad). **Requisito forte por questões de segurança.**
- Usar **TDD** (Test-Driven Development) em todo o projeto.
- Usar o **MCP Context7** para consultar documentação atualizada das bibliotecas.

### 5.1 Framework de aplicação

Decisão (com ressalvas) em [ADR-0001](./adr/0001-tauri-como-framework-de-aplicacao.md) — status *proposed*.

| Item | Valor |
|---|---|
| Framework | Tauri 2 (última versão estável) |
| Backend | Rust |
| Frontend | React + TypeScript via Vite |
| Componentes UI | [Glass UI](https://glass-ui.crenspire.com/) (componentes shadcn/ui com estilo Liquid Glass) |
| Estilização | Tailwind CSS 4.1 |

#### Arquitetura (se Tauri for adotado)

- Toda lógica de acesso a banco de dados e sistema de arquivos reside no **backend Rust**.
- O frontend TypeScript comunica-se com o backend exclusivamente via **Tauri Commands** (`invoke`) quando executado dentro do app desktop (webview Tauri).
- O frontend é responsável apenas por **renderização de UI** e chamada de comandos.

#### Acesso via rede local (modo tablet)

O app desktop embute um **servidor HTTP local** (sugestão: Axum, no backend Rust) que serve a mesma SPA React na rede local, permitindo que o iPad (ou qualquer outro dispositivo) acesse o formulário de Auto-cadastro via navegador comum — sem instalar nenhum app.

- O servidor expõe **rotas REST** equivalentes aos Tauri Commands apenas para os fluxos usados no Auto-cadastro, já que `invoke()` não está disponível fora do webview Tauri. A lógica de negócio pode ser duplicada entre o Command e a rota HTTP quando necessário.
- **Sem autenticação** — ver [ADR-0003](./adr/0003-rede-local-sem-autenticacao.md).
- O frontend detecta o contexto de execução via `window.__TAURI__` (presente = app desktop; ausente = navegador externo) para decidir se aplica o modo tablet — mesma SPA, sem bundle separado. Consequência aceita: **qualquer** navegador externo (inclusive o celular da terapeuta) cai no modo tablet.

### 5.2 Banco de dados

Decisão em [ADR-0002](./adr/0002-sqlite-como-banco-de-dados.md) — status *proposed*.

| Item | Valor |
|---|---|
| Banco | SQLite (última versão estável) |
| Plugin Tauri | `tauri-plugin-sql` (com feature `sqlite`) |
| ORM (frontend) | Drizzle ORM (modo SQLite proxy) |
| Migrations | `drizzle-kit` |

#### Padrão de comunicação

```
[Frontend: Drizzle ORM (proxy)] → invoke() → [Backend: tauri-plugin-sql] → [SQLite]
```

O Drizzle gera as queries SQL e as envia ao backend Rust via `invoke`. O `tauri-plugin-sql` executa as queries no SQLite e retorna os resultados.

### 5.3 Transcrição de áudio: Whisper (offline)

Decisão em [ADR-0004](./adr/0004-transcricao-offline-com-whisper.md).

| Item | Valor |
|---|---|
| Modelo | OpenAI Whisper (via whisper.cpp) |
| Crate Rust | `whisper-rs` |
| Execução | 100% local/offline |
| Idioma | pt-BR |

#### Padrão de comunicação

```
[Frontend: captura áudio (Web Audio API)] → invoke("transcrever_audio", amostras f32 no corpo bruto) → [Backend Rust: whisper-rs] → texto transcrito
```

### 5.4 Linting e formatação: Biome

| Item | Valor |
|---|---|
| Ferramenta | [Biome](https://biomejs.dev/) |
| Escopo | Linting + formatação de TypeScript, JSX e JSON |

- Substituir ESLint e Prettier por **Biome** como ferramenta única de lint e formatação no frontend.
- Configurar via `biome.json` na raiz do projeto.

### 5.5 Tooling: mise

| Item | Valor |
|---|---|
| Ferramenta | [mise](https://mise.jdx.dev/) |
| Função | Gerenciamento de versões de ferramentas (Node.js, Rust, etc.) e execução de tasks |

- Usar `mise` para garantir versões consistentes de Node.js, Rust e demais ferramentas do projeto.
- Configurar via `.mise.toml` na raiz do projeto.
