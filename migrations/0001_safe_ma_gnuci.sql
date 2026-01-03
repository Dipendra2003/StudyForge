CREATE TABLE `deck_flashcards` (
	`deck_id` int NOT NULL,
	`flashcard_id` int NOT NULL,
	`position` int DEFAULT 0,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deck_flashcards_deck_id_flashcard_id_pk` PRIMARY KEY(`deck_id`,`flashcard_id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`email_type` varchar(50) NOT NULL,
	`recipient` varchar(100) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL,
	`error_message` text,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_decks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_public` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcard_decks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`user_agent` text,
	`ip_address` varchar(45),
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `security_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`details` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `authentication`;--> statement-breakpoint
ALTER TABLE `summaries` MODIFY COLUMN `document_id` int;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email_verified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `verification_token` text;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `reset_token` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `question_image` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `answer_image` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `category` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `failed_login_attempts` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `last_failed_login` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `account_locked_until` timestamp;--> statement-breakpoint
ALTER TABLE `deck_flashcards` ADD CONSTRAINT `deck_flashcards_deck_id_flashcard_decks_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deck_flashcards` ADD CONSTRAINT `deck_flashcards_flashcard_id_flashcards_id_fk` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_decks` ADD CONSTRAINT `flashcard_decks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `security_audit_logs` ADD CONSTRAINT `security_audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `df_deck_id_idx` ON `deck_flashcards` (`deck_id`);--> statement-breakpoint
CREATE INDEX `df_flashcard_id_idx` ON `deck_flashcards` (`flashcard_id`);--> statement-breakpoint
CREATE INDEX `email_logs_user_id_idx` ON `email_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_logs_email_type_idx` ON `email_logs` (`email_type`);--> statement-breakpoint
CREATE INDEX `email_logs_sent_at_idx` ON `email_logs` (`sent_at`);--> statement-breakpoint
CREATE INDEX `fb_user_id_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `fb_message_id_idx` ON `feedback` (`message_id`);--> statement-breakpoint
CREATE INDEX `fb_type_idx` ON `feedback` (`type`);--> statement-breakpoint
CREATE INDEX `fd_user_id_idx` ON `flashcard_decks` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_id_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_token_idx` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_expires_at_idx` ON `refresh_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `security_audit_logs_user_id_idx` ON `security_audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `security_audit_logs_action_idx` ON `security_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `security_audit_logs_created_at_idx` ON `security_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `fc_category_idx` ON `flashcards` (`user_id`,`category`);