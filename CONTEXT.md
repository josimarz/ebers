# Ebers

Contexto único: gerenciamento de pacientes, consultas e pagamentos do consultório de psicologia de uma única terapeuta.

Este arquivo é somente o glossário. A especificação funcional vive em [`docs/especificacao.md`](./docs/especificacao.md); as decisões de arquitetura em [`docs/adr/`](./docs/adr/).

## Linguagem

**Terapeuta**:
A única usuária do sistema; dona de todos os cadastros, consultas e anotações.
_Evitar_: usuário(a), psicóloga, profissional

**Paciente**:
Pessoa atendida no consultório, com cadastro clínico e financeiro. Nunca é excluído do sistema.
_Evitar_: cliente, usuário

**Responsável legal**:
Adulto que responde por um Paciente menor de 18 anos. Obrigatório para menores; opcional para os demais.

**Auto-cadastro**:
Preenchimento do próprio cadastro pelo Paciente no tablet do consultório. Só cria Pacientes — nunca edita.
_Evitar_: cadastro remoto, pré-cadastro

**Modo tablet**:
O sistema restrito ao Auto-cadastro, como visto de um navegador na rede local. Sem menu, sem saída.
_Evitar_: modo quiosque, modo iPad

**Modo desktop**:
O sistema completo, usado pela Terapeuta no aplicativo.

**Consulta**:
Um atendimento em andamento ou já ocorrido. Nasce no momento em que o atendimento começa — nunca é um agendamento futuro.
_Evitar_: sessão, atendimento, agendamento

**Consulta Aberta**:
Consulta em andamento. Um Paciente tem no máximo uma Aberta por vez.
_Evitar_: consulta em aberto (ambíguo com pendência de pagamento), em andamento

**Consulta Finalizada**:
Consulta concluída. Conteúdo e Notas continuam editáveis; o pagamento ainda pode ser registrado ou desfeito.

**Consulta Cancelada**:
Consulta interrompida ou não realizada, preservada para histórico. Somente leitura, fora de todas as contagens financeiras; devolve o Crédito que houver consumido.

**Conteúdo**:
O relato do paciente numa Consulta (texto plano; recebe a transcrição de voz).
_Evitar_: transcrição, relato

**Notas**:
As anotações da Terapeuta numa Consulta (texto rico).
_Evitar_: observações, prontuário

**Valor da consulta**:
O preço atual acordado entre Terapeuta e Paciente; vive no cadastro do Paciente.
_Evitar_: preço (reservado para a Consulta)

**Valor padrão da consulta**:
O preço de tabela do consultório. Pré-preenche todo cadastro novo no modo desktop e é aplicado automaticamente no Auto-cadastro.

**Preço**:
O valor de uma Consulta específica, congelado na criação a partir do Valor da consulta.
_Evitar_: valor

**Crédito**:
Uma consulta pré-paga. Debitado na criação da Consulta; nunca quita Consultas passadas.
_Evitar_: saldo (é a soma dos Movimentos), pacote

**Movimento de crédito**:
Lançamento no extrato de Créditos de um Paciente — Venda, Consumo, Estorno ou Ajuste. O saldo é derivado dos movimentos, nunca editado diretamente.
_Evitar_: transação

**Pagamento direto**:
Pagamento recebido fora do sistema (dinheiro, Pix) e registrado na Consulta via "Efetuar Pagamento".
_Evitar_: pagamento em dinheiro

**Origem do pagamento**:
Como uma Consulta paga foi paga — por Crédito ou por Pagamento direto.

**Pendência financeira**:
Consultas Finalizadas e não pagas de um Paciente; o que o destaque vermelho do controle financeiro sinaliza.
_Evitar_: dívida, inadimplência
