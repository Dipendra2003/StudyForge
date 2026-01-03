CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`question` text NOT NULL,
	`question_data` json NOT NULL,
	`correct_answer` json NOT NULL,
	`explanation` text,
	`category` varchar(50) NOT NULL,
	`difficulty` varchar(10) NOT NULL DEFAULT 'medium',
	`tags` json,
	`hints` json,
	`is_public` boolean DEFAULT false,
	`usage_count` int DEFAULT 0,
	`average_score` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`category` varchar(50) NOT NULL,
	`difficulty` varchar(10) NOT NULL,
	`question_types` json NOT NULL,
	`total_questions` int NOT NULL,
	`current_question_index` int DEFAULT 0,
	`questions_data` json NOT NULL,
	`answers_data` json,
	`timed_mode` boolean DEFAULT false,
	`time_limit` int,
	`time_spent` int DEFAULT 0,
	`voice_mode_enabled` boolean DEFAULT false,
	`hints_used` int DEFAULT 0,
	`completed` boolean DEFAULT false,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `quiz_sessions_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `user_quiz_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`total_attempts` int DEFAULT 0,
	`total_questions` int DEFAULT 0,
	`correct_answers` int DEFAULT 0,
	`incorrect_answers` int DEFAULT 0,
	`average_score` int DEFAULT 0,
	`average_accuracy` int DEFAULT 0,
	`total_time_spent` int DEFAULT 0,
	`current_streak` int DEFAULT 0,
	`longest_streak` int DEFAULT 0,
	`last_quiz_date` timestamp,
	`category_stats` json,
	`difficulty_stats` json,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_quiz_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_quiz_stats_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_sessions` ADD CONSTRAINT `quiz_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_quiz_stats` ADD CONSTRAINT `user_quiz_stats_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `q_user_id_idx` ON `questions` (`user_id`);--> statement-breakpoint
CREATE INDEX `q_type_idx` ON `questions` (`type`);--> statement-breakpoint
CREATE INDEX `q_category_idx` ON `questions` (`category`);--> statement-breakpoint
CREATE INDEX `q_difficulty_idx` ON `questions` (`difficulty`);--> statement-breakpoint
CREATE INDEX `q_created_at_idx` ON `questions` (`created_at`);--> statement-breakpoint
CREATE INDEX `qs_user_id_idx` ON `quiz_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `qs_session_id_idx` ON `quiz_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `qs_category_idx` ON `quiz_sessions` (`category`);--> statement-breakpoint
CREATE INDEX `qs_difficulty_idx` ON `quiz_sessions` (`difficulty`);--> statement-breakpoint
CREATE INDEX `qs_created_at_idx` ON `quiz_sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `uqs_user_id_idx` ON `user_quiz_stats` (`user_id`);