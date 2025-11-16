CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`badge` varchar(50) NOT NULL,
	`description` text,
	`level` int DEFAULT 1,
	`earned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `authentication` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255),
	`provider` varchar(20) NOT NULL DEFAULT 'local',
	`refresh_token` text,
	`expires_at` timestamp,
	`ip_address` varchar(50),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authentication_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cached_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(500) NOT NULL,
	`response` text NOT NULL,
	`metadata` json,
	`ttl` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cached_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`subject` varchar(255),
	`messages` json NOT NULL,
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_history_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `code_snippets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`problem` text NOT NULL,
	`code` text NOT NULL,
	`language` varchar(50) NOT NULL,
	`explanation` text NOT NULL,
	`tags` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `code_snippets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`file_url` text,
	`file_type` varchar(20),
	`summary` text,
	`is_private` boolean DEFAULT true,
	`status` varchar(20) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_id` int,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`tags` json,
	`difficulty` varchar(10) DEFAULT 'medium',
	`repetition_interval` int DEFAULT 1,
	`ease_factor` int DEFAULT 250,
	`last_reviewed` timestamp,
	`next_review_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mcqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_id` int,
	`question` text NOT NULL,
	`options` json NOT NULL,
	`correct_option` int NOT NULL,
	`explanation` text,
	`difficulty` varchar(10) NOT NULL DEFAULT 'medium',
	`category` varchar(50),
	`is_public` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mcqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quiz_attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`user_answer` int,
	`is_correct` boolean NOT NULL,
	`time_spent` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`score` int NOT NULL,
	`total_questions` int NOT NULL,
	`correct_answers` int NOT NULL,
	`time_spent` int,
	`questions_data` json,
	`category` varchar(50),
	`difficulty` varchar(10),
	`completed` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`schedule_data` json,
	`start_date` timestamp,
	`end_date` timestamp,
	`completed_percentage` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`study_plan_id` int,
	`duration` int NOT NULL,
	`subject` varchar(100),
	`notes` text,
	`start_time` timestamp NOT NULL,
	`end_time` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_id` int NOT NULL,
	`original_text` text NOT NULL,
	`summary` text NOT NULL,
	`key_points` json,
	`keywords` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`total_study_time` int DEFAULT 0,
	`quizzes_completed` int DEFAULT 0,
	`average_score` int DEFAULT 0,
	`documents_uploaded` int DEFAULT 0,
	`flashcards_created` int DEFAULT 0,
	`flashcards_reviewed` int DEFAULT 0,
	`correct_flashcards` int DEFAULT 0,
	`incorrect_flashcards` int DEFAULT 0,
	`code_snippets_generated` int DEFAULT 0,
	`questions_asked` int DEFAULT 0,
	`streak_days` int DEFAULT 0,
	`longest_streak` int DEFAULT 0,
	`xp_points` int DEFAULT 0,
	`level` int DEFAULT 1,
	`last_active` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stats_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password` text NOT NULL,
	`email` varchar(100) NOT NULL,
	`full_name` varchar(100),
	`profile_picture` text,
	`preferred_language` varchar(10) DEFAULT 'en',
	`role` varchar(20) NOT NULL DEFAULT 'user',
	`last_login` timestamp,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authentication` ADD CONSTRAINT `authentication_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_history` ADD CONSTRAINT `chat_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `code_snippets` ADD CONSTRAINT `code_snippets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mcqs` ADD CONSTRAINT `mcqs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mcqs` ADD CONSTRAINT `mcqs_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_attempts` ADD CONSTRAINT `question_attempts_quiz_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_plans` ADD CONSTRAINT `study_plans_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD CONSTRAINT `study_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD CONSTRAINT `study_sessions_study_plan_id_study_plans_id_fk` FOREIGN KEY (`study_plan_id`) REFERENCES `study_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summaries` ADD CONSTRAINT `summaries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summaries` ADD CONSTRAINT `summaries_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ach_user_id_idx` ON `achievements` (`user_id`);--> statement-breakpoint
CREATE INDEX `ach_badge_idx` ON `achievements` (`badge`);--> statement-breakpoint
CREATE INDEX `auth_user_id_idx` ON `authentication` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_token_idx` ON `authentication` (`token`);--> statement-breakpoint
CREATE INDEX `cr_query_idx` ON `cached_responses` (`query`);--> statement-breakpoint
CREATE INDEX `cr_ttl_idx` ON `cached_responses` (`ttl`);--> statement-breakpoint
CREATE INDEX `chat_user_id_idx` ON `chat_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_session_id_idx` ON `chat_history` (`session_id`);--> statement-breakpoint
CREATE INDEX `chat_last_updated_idx` ON `chat_history` (`last_updated`);--> statement-breakpoint
CREATE INDEX `cs_user_id_idx` ON `code_snippets` (`user_id`);--> statement-breakpoint
CREATE INDEX `cs_language_idx` ON `code_snippets` (`language`);--> statement-breakpoint
CREATE INDEX `cs_title_idx` ON `code_snippets` (`title`);--> statement-breakpoint
CREATE INDEX `doc_user_id_idx` ON `documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `doc_title_idx` ON `documents` (`title`);--> statement-breakpoint
CREATE INDEX `doc_status_idx` ON `documents` (`status`);--> statement-breakpoint
CREATE INDEX `fc_user_id_idx` ON `flashcards` (`user_id`);--> statement-breakpoint
CREATE INDEX `fc_doc_id_idx` ON `flashcards` (`document_id`);--> statement-breakpoint
CREATE INDEX `fc_review_date_idx` ON `flashcards` (`next_review_date`);--> statement-breakpoint
CREATE INDEX `mcq_user_id_idx` ON `mcqs` (`user_id`);--> statement-breakpoint
CREATE INDEX `mcq_doc_id_idx` ON `mcqs` (`document_id`);--> statement-breakpoint
CREATE INDEX `mcq_difficulty_idx` ON `mcqs` (`difficulty`);--> statement-breakpoint
CREATE INDEX `mcq_category_idx` ON `mcqs` (`category`);--> statement-breakpoint
CREATE INDEX `qst_quiz_id_idx` ON `question_attempts` (`quiz_attempt_id`);--> statement-breakpoint
CREATE INDEX `qst_question_id_idx` ON `question_attempts` (`question_id`);--> statement-breakpoint
CREATE INDEX `qa_user_id_idx` ON `quiz_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `qa_created_at_idx` ON `quiz_attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `sp_user_id_idx` ON `study_plans` (`user_id`);--> statement-breakpoint
CREATE INDEX `sp_status_idx` ON `study_plans` (`status`);--> statement-breakpoint
CREATE INDEX `sp_date_range_idx` ON `study_plans` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `ss_user_id_idx` ON `study_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `ss_plan_id_idx` ON `study_sessions` (`study_plan_id`);--> statement-breakpoint
CREATE INDEX `ss_date_idx` ON `study_sessions` (`start_time`);--> statement-breakpoint
CREATE INDEX `sum_user_id_idx` ON `summaries` (`user_id`);--> statement-breakpoint
CREATE INDEX `sum_doc_id_idx` ON `summaries` (`document_id`);--> statement-breakpoint
CREATE INDEX `us_user_id_idx` ON `user_stats` (`user_id`);--> statement-breakpoint
CREATE INDEX `us_level_idx` ON `user_stats` (`level`);--> statement-breakpoint
CREATE INDEX `us_streak_idx` ON `user_stats` (`streak_days`);