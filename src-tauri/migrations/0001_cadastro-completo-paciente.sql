-- Cadastro completo do Paciente (spec 1.1). SQLite não aceita ADD COLUMN
-- NOT NULL sem default, então a tabela é recriada. Recriação destrutiva de
-- propósito: pré-lançamento, e as linhas do esqueleto (só nome_completo)
-- não têm como preencher os campos obrigatórios do cadastro real.
DROP TABLE `pacientes`;--> statement-breakpoint
CREATE TABLE `pacientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome_completo` text NOT NULL,
	`data_nascimento` text NOT NULL,
	`genero` text NOT NULL,
	`cpf` text NOT NULL,
	`rg` text,
	`religiao` text NOT NULL,
	`responsavel_legal` text,
	`email_responsavel_legal` text,
	`cpf_responsavel_legal` text,
	`telefone_1` text NOT NULL,
	`telefone_2` text,
	`email` text,
	`ja_fez_terapia` integer NOT NULL,
	`quando_fez_terapia` text,
	`toma_medicamento` integer NOT NULL,
	`toma_medicamento_desde_quando` text,
	`nomes_medicamentos` text,
	`ja_foi_hospitalizado` integer NOT NULL,
	`quando_foi_hospitalizado` text,
	`razao_hospitalizacao` text,
	`valor_consulta_centavos` integer NOT NULL,
	`periodicidade` text,
	`dia_semana_consulta` text
);--> statement-breakpoint
CREATE UNIQUE INDEX `pacientes_cpf_unique` ON `pacientes` (`cpf`);
