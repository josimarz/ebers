---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# Introdução

Este documento contém as regras de negócio do produto **Ebers**, um *software* para gerenciamento de pacientes e consultas de um consultório de psicologia.

**A INTERFACE DO SISTEMA DEVE SER EM PORTUGUÊS BRASILEIRO (pt-BR)**

Os tópicos abaixo descrevem as funcionalidades do sistema.

## Gerenciamento de pacientes

O *software* deverá permitir o gerenciamento de pacientes. Para cada paciente, deve-se armazenar os seguintes dados (campos marcads com asterísco são obrigatórios):

- Nome completo *
- Foto de perfil
- Data de nascimento *
- Gênero: *
  - Masculino
  - Feminino
  - Não binário
- CPF
- RG
- Religião *
  - Ateu
  - Budismo
  - Candomblé
  - Católica
  - Espírita
  - Espiritualista
  - Evangélica
  - Hinduísmo
  - Islamismo
  - Judaísmo
  - Mórmon
  - Sem religião
  - Testemunha de Jeová
  - Umbanda
- Responsável legal
- Email do responsável legal (obrigatório caso **Responsável legal** for preenchido)
- CPF do responsável legal
- Telefone 1 *
- Telefone 2
- Email
- Já fez terapia? *
  - Sim
  - Não
- Quando fez terapia? (campo de texto aberto)
- Toma algum medicamento? *
  - Sim
  - Não
- Toma medicamento desde quando (campo de texto aberto)
- Nomes dos medicamentos
- Já foi hospitalizado por questões psicológicas? *
  - Sim
  - Não
- Quando foi hospitalizado?
- Razão da hospitalização
- Valor da consulta (esse valor será acordado entre terapeuta e paciente)
- Peridiocidade da consulta
  - Semanal
  - Quinzenal
  - Mensal
  - Esporádica
- Dia da semana da consulta

**Nota:** O sistema mantém um campo de créditos para cada paciente que contabiliza os créditos disponíveis. Por exemplo, um paciente pode pagar antecipadamente 10 consultas. Sempre que uma consulta é realizada, um crédito é consumido. Este campo é gerenciado exclusivamente através da funcionalidade de venda de créditos no controle financeiro.

### Listagem de pacientes

Deve-se criar uma página para listar todos os pacientes já cadastrados no banco de dados. A tabela de listagem dos pacientes deverá exibir as seguintes colunas:

- Foto de perfil: coluna sem *label*, deve exibir uma foto redonda e pequena do paciente para identificação rápida
- Nome: nome completo do paciente
- Idade: idade do paciente
- Telefone: telefone 1
- Peridiocidade
- Dia da semana: dia da semana da consulta
- Créditos
- Ações
  - Botão para editar paciente
  - Botão para iniciar nova consulta

- A listagem deverá páginar os pacientes de 10 em 10
- Deve-se permitir ordenar os pacientes pelas colunas:
  - Nome
  - Idade
- Deve-se permitir filtrar os pacientes pelo nome

### Formulário de cadastro de paciente

Deve-se criar uma página para cadastro de pacientes. Este formulário poderá ser acessado pelo próprio paciente via iPad para auto-cadastro, portanto a página deve ser responsiva.

**Sempre que o sistema for acessado de um dispositivo iPad, o usuário deverá ser direcionado para a página de cadastro de um novo paciente.** O fluxo funciona assim:

- Terapeuta acessa o sistema via iPad
- Terapeuta entrega iPad para o paciente concluir cadastro

Portanto, quando o sistema for acessado via iPad, **não será possível**:

- Sair da tela de cadastro
- Preencher os seguintes campos:
  - Valor da consulta
  - Peridiocidade da consulta
  - Dia da semana da consulta

Quando o formulário de cadastro/edição de paciente for acessado via computador, todos os recursos estarão disponíveis, permitindo à terapeuta ajustar o cadastro e preencher todos os campos.

### Gerenciamento de consultas

#### Nova consulta

Através da listagem de pacientes, será possível abrir uma nova consulta ou acessar a última consulta ativa do paciente, dependendo da situação. Na listagem de pacientes, deverá haver uma coluna denominada **Ações**. Se o paciente não possui nenhuma consulta em aberto, deve-se exibir um botão **Nova Consulta**. Quando a terapeuta aciona esse botão, o sistema criará uma nova consulta. Uma consulta é composta pelos seguintes campos:

| Campo         | Tipo      | Valor padrão                                | Detalhes               |
|---------------|-----------|---------------------------------------------|------------------------|
| Iniciado em   | data/hora | Data/hora de criação do registro            |                        |
| Finalizado em | data/hora | Nulo                                        |                        |
| Pago em       | data/hora | Nulo                                        |                        |
| Status        | texto     | "Aberta"                                    |                        |
| Conteúdo      | texto     | Vazio                                       | Conteúdo do paciente   |
| Notas         | texto     | Vazio                                       | Anotações da terapeuta |
| Preço         | decimal   | Valor da consulta do paciente               |                        |
| Pago          | booleano  | Se paciente tem crédito é true, senão false |                        |

Quando uma nova consulta for criada, o sistema deverá verificar se o paciente tem crédito. Se o paciente tem crédito, deve-se preencher o campo **Pago em** ao criar o registro e campo **Pago** com `true`, além de descontar um crédito do cadastro do paciente.

A página de consulta deverá exibir uma cabeçalho com:

- Foto do paciente
- Nome do paciente
- Idade do paciente
- Timer com tempo da consulta
- Botão para finalizar consulta
- Botão para efetuar pagamento

O *timer* deve ser atualizado em tempo real. Cada consulta tem duração de 1 hora. Portanto, deve-se mudar a cor do *timer* para alertar a terapeuta que a consulta está próxima de acabar:

- Verde: mais de 15 minutos restantes
- Amarela: mais de 5 minutos restantes
- Vermelha: 5 minutos ou menos restantes

No corpo da tela de consulta, deve-se exibir dois campos grandes:

- Conteúdo: aqui a terapeuta escreve o que o paciente fala
- Notas: aqui a terapeuta faz anotações relevantes

Ambos os campos devem usar editores HTML com:

- Negrito
- Itálico
- Sublinhado
- Riscado
- Cores básicas
- Tamanho de fonte
- Títulos (h1, h2, h3, etc...)

Quando a terapeuta pressiona o botão **Finalizar Consulta**:

- *status* da consulta é modificado para **Finalizada**
- data/hora de finalização da consulta é preenchido

Quando a terapeuta pressiona o botão **Efetuar Pagamento**:

- consulta é marcada como paga

Na listagem de pacientes, se um paciente possui uma consulta **não finalizada**, ao invés de exibir o botão **Nova Consulta** deve-se exibir o botão **Consulta** que redicionará a terapeuta para a tela da última consulta em aberto. Uma nova consulta somente poderá ser criada quando todas as consultas em abertas de um paciente forem finalizadas.

#### Listagem de consultas

Também deve-se criar uma página para listagem de consultas. A listagem deve exibir as seguintes colunas:

- Foto do paciente
- Data da consulta
- Horário de início da consulta
- Horário de fim da consulta
- Status
- Pago

Deve-se também permitir:

- Filtrar consultas por paciente (use um dropdown com autocomplete)
- Ordenar consultas por data (por padrão da mais recente para a mais antiga)

Quando a terapeuta clicar sobre a linha de uma consulta, deve ser direcionada para a página da consulta.

### Controle financeiro

Deve-se criar também uma área para controle financeiro.

#### Listagem de pacientes no controle financeiro

Deve-se criar uma tabela para listar todos os pacientes. A listagem deve conter as seguintes colunas:

- Foto do paciente
- Nome do paciente
- Consultas feitas (mostrar total de consultas)
- Consultas pagas (mostrar total de consultas pagas)
- Créditos (mostrar total de créditos disponíveis)
- Botão para listar consultas do paciente
- Botão para acessas cadastro do paciente

Regras:

- Caso o total de **Consultas pagas** for inferior ao total de **Consultas feitas**, a linha deve ser destacada na cor vermelha
- A listagem deve ordenar por padrão os **piores pacientes** no topo, isto é, os pacientes cujo diferença entre **Consultas feitas** e **Consultas pagas** é maior
- Deve-se permitir filtrar pacientes; use uma dropdown com autocomplete

#### Venda de créditos

Na área de controle financeiro, a terapeuta poderá efetuar a venda de créditos para os pacientes. Deve-se exibir um botão **Vender créditos** na linha de cada paciente. Ao clicar neste botão, deve-se abrir uma janela modal onde a terapeuta deverá informar a quantidade de créditos que serão comprados. Deve-se também exibir o valor total, multiplicando a quantidade de créditos pelo valor da consulta do paciente. Portanto, só é possível vender créditos depois que o valor da consulta foi acordado entre terapeuta e paciente. Após a confirmação da venda, os créditos devem ser adicionados ao saldo do paciente.

## Layout e estilos

### Layout

O sistema deve ter um layout com:

- Menu lateral à esquerda (sidebar)
- Cabeçalho:
  - Breadcrumb
- Corpo
  - Título da paciente
  - Conteúdo
- Rodapé

### Estilos

Use a seguinte paleta de cores para o sistema:

- Primária: #197BBD
- Secundária: #125E8A
- Texto: #204B57
- Confirmação/verde: #16a085
- Alerta/amarelo: #f39c12
- Excluir/cancelar/vermelhor: #c0392b