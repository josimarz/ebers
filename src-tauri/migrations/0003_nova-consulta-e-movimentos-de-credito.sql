CREATE TABLE `consultas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`iniciado_em` text NOT NULL,
	`finalizado_em` text,
	`pago_em` text,
	`status` text DEFAULT 'Aberta' NOT NULL,
	`conteudo` text DEFAULT '' NOT NULL,
	`notas` text DEFAULT '' NOT NULL,
	`preco_centavos` integer NOT NULL,
	`pago` integer DEFAULT false NOT NULL,
	`origem_pagamento` text,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consultas_paciente_aberta_unica` ON `consultas` (`paciente_id`) WHERE "consultas"."status" = 'Aberta';--> statement-breakpoint
CREATE TABLE `movimentos_credito` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paciente_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`quantidade` integer NOT NULL,
	`ocorrido_em` text NOT NULL,
	`consulta_id` integer,
	`valor_unitario_centavos` integer,
	`motivo` text,
	FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consulta_id`) REFERENCES `consultas`(`id`) ON UPDATE no action ON DELETE no action
);
