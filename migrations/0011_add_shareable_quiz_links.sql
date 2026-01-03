-- Add shareable quiz links table
CREATE TABLE IF NOT EXISTS `shareable_quiz_links` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `link_id` varchar(100) NOT NULL UNIQUE,
  `creator_user_id` int NOT NULL,
  `quiz_attempt_id` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `difficulty` varchar(10) NOT NULL,
  `questions_data` json NOT NULL,
  `total_questions` int NOT NULL,
  `expires_at` timestamp NULL,
  `is_active` boolean DEFAULT true,
  `view_count` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`creator_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE CASCADE,
  INDEX `sql_link_id_idx` (`link_id`),
  INDEX `sql_creator_idx` (`creator_user_id`),
  INDEX `sql_expires_at_idx` (`expires_at`)
);

-- Add shared quiz attempts table to track who took shared quizzes
CREATE TABLE IF NOT EXISTS `shared_quiz_attempts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `shareable_link_id` int NOT NULL,
  `user_id` int NOT NULL,
  `quiz_attempt_id` int NOT NULL,
  `score` int NOT NULL,
  `total_questions` int NOT NULL,
  `correct_answers` int NOT NULL,
  `time_spent` int NOT NULL,
  `accuracy` int NOT NULL,
  `completed_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`shareable_link_id`) REFERENCES `shareable_quiz_links`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE CASCADE,
  INDEX `sqa_link_idx` (`shareable_link_id`),
  INDEX `sqa_user_idx` (`user_id`),
  UNIQUE KEY `unique_user_link` (`shareable_link_id`, `user_id`)
);
