CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`file_url` text NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`source` varchar(50) NOT NULL DEFAULT 'chat',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(100) NOT NULL,
	`email` varchar(100) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorite_quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`category` varchar(255) NOT NULL,
	`difficulty` varchar(10) NOT NULL,
	`question_types` json NOT NULL,
	`question_count` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`favorited_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_quizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_quiz` UNIQUE(`user_id`,`category`,`difficulty`)
);
--> statement-breakpoint
CREATE TABLE `quiz_of_the_day_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`quiz_id` varchar(50) NOT NULL,
	`date` timestamp NOT NULL,
	`category` varchar(255) NOT NULL,
	`difficulty` varchar(10) NOT NULL,
	`score` int NOT NULL,
	`total_questions` int NOT NULL,
	`correct_answers` int NOT NULL,
	`time_spent` int NOT NULL,
	`accuracy` int NOT NULL,
	`bonus_awarded` int NOT NULL,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_of_the_day_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `qotd_user_date_unique` UNIQUE(`user_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `saved_quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`category` varchar(255) NOT NULL,
	`difficulty` varchar(10) NOT NULL,
	`question_types` json NOT NULL,
	`question_count` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`saved_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shareable_quiz_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`link_id` varchar(100) NOT NULL,
	`creator_user_id` int NOT NULL,
	`quiz_attempt_id` int NOT NULL,
	`category` varchar(255) NOT NULL,
	`difficulty` varchar(10) NOT NULL,
	`questions_data` json NOT NULL,
	`total_questions` int NOT NULL,
	`expires_at` timestamp,
	`is_active` boolean DEFAULT true,
	`view_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shareable_quiz_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `shareable_quiz_links_link_id_unique` UNIQUE(`link_id`)
);
--> statement-breakpoint
CREATE TABLE `shared_quiz_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareable_link_id` int NOT NULL,
	`user_id` int NOT NULL,
	`quiz_attempt_id` int NOT NULL,
	`score` int NOT NULL,
	`total_questions` int NOT NULL,
	`correct_answers` int NOT NULL,
	`time_spent` int NOT NULL,
	`accuracy` int NOT NULL,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_quiz_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_link` UNIQUE(`shareable_link_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `flashcards` MODIFY COLUMN `category` varchar(255);--> statement-breakpoint
ALTER TABLE `mcqs` MODIFY COLUMN `category` varchar(255);--> statement-breakpoint
ALTER TABLE `question_attempts` MODIFY COLUMN `user_answer` text;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `category` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_attempts` MODIFY COLUMN `category` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_sessions` MODIFY COLUMN `category` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `summaries` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `users` ADD `pending_email` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `email_change_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_change_otp` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `email_change_token_expiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `backup_email` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `security_question_1` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `security_answer_1` text;--> statement-breakpoint
ALTER TABLE `users` ADD `security_question_2` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `security_answer_2` text;--> statement-breakpoint
ALTER TABLE `users` ADD `total_points` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `media_retention_days` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `achievements` ADD CONSTRAINT `ach_user_badge_uidx` UNIQUE(`user_id`,`badge`);--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_quizzes` ADD CONSTRAINT `favorite_quizzes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_of_the_day_completions` ADD CONSTRAINT `quiz_of_the_day_completions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_quizzes` ADD CONSTRAINT `saved_quizzes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shareable_quiz_links` ADD CONSTRAINT `shareable_quiz_links_creator_user_id_users_id_fk` FOREIGN KEY (`creator_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shareable_quiz_links` ADD CONSTRAINT `shareable_quiz_links_quiz_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_quiz_attempts` ADD CONSTRAINT `shared_quiz_attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_quiz_attempts` ADD CONSTRAINT `shared_quiz_attempts_quiz_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_quiz_attempts` ADD CONSTRAINT `sqa_link_fk` FOREIGN KEY (`shareable_link_id`) REFERENCES `shareable_quiz_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attachment_user_id_idx` ON `attachments` (`user_id`);--> statement-breakpoint
CREATE INDEX `attachment_source_idx` ON `attachments` (`source`);--> statement-breakpoint
CREATE INDEX `attachment_created_at_idx` ON `attachments` (`created_at`);--> statement-breakpoint
CREATE INDEX `contact_user_id_idx` ON `contact_messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `contact_status_idx` ON `contact_messages` (`status`);--> statement-breakpoint
CREATE INDEX `contact_created_at_idx` ON `contact_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `fq_user_id_idx` ON `favorite_quizzes` (`user_id`);--> statement-breakpoint
CREATE INDEX `fq_category_idx` ON `favorite_quizzes` (`category`);--> statement-breakpoint
CREATE INDEX `fq_favorited_at_idx` ON `favorite_quizzes` (`favorited_at`);--> statement-breakpoint
CREATE INDEX `qotd_user_id_idx` ON `quiz_of_the_day_completions` (`user_id`);--> statement-breakpoint
CREATE INDEX `qotd_date_idx` ON `quiz_of_the_day_completions` (`date`);--> statement-breakpoint
CREATE INDEX `qotd_quiz_id_idx` ON `quiz_of_the_day_completions` (`quiz_id`);--> statement-breakpoint
CREATE INDEX `sq_user_id_idx` ON `saved_quizzes` (`user_id`);--> statement-breakpoint
CREATE INDEX `sq_category_idx` ON `saved_quizzes` (`category`);--> statement-breakpoint
CREATE INDEX `sq_saved_at_idx` ON `saved_quizzes` (`saved_at`);--> statement-breakpoint
CREATE INDEX `sql_link_id_idx` ON `shareable_quiz_links` (`link_id`);--> statement-breakpoint
CREATE INDEX `sql_creator_idx` ON `shareable_quiz_links` (`creator_user_id`);--> statement-breakpoint
CREATE INDEX `sql_expires_at_idx` ON `shareable_quiz_links` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sqa_link_idx` ON `shared_quiz_attempts` (`shareable_link_id`);--> statement-breakpoint
CREATE INDEX `sqa_user_idx` ON `shared_quiz_attempts` (`user_id`);--> statement-breakpoint
ALTER TABLE `quiz_sessions` DROP COLUMN `voice_mode_enabled`;