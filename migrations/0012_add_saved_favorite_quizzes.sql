-- Add saved quizzes table
CREATE TABLE IF NOT EXISTS `saved_quizzes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `difficulty` varchar(10) NOT NULL,
  `question_types` json NOT NULL,
  `question_count` int NOT NULL,
  `title` varchar(255),
  `description` text,
  `saved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `saved_quizzes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX `sq_user_id_idx` ON `saved_quizzes` (`user_id`);
CREATE INDEX `sq_category_idx` ON `saved_quizzes` (`category`);
CREATE INDEX `sq_saved_at_idx` ON `saved_quizzes` (`saved_at`);

-- Add favorite quizzes table
CREATE TABLE IF NOT EXISTS `favorite_quizzes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `difficulty` varchar(10) NOT NULL,
  `question_types` json NOT NULL,
  `question_count` int NOT NULL,
  `title` varchar(255),
  `description` text,
  `favorited_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `favorite_quizzes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `unique_user_quiz` UNIQUE (`user_id`, `category`, `difficulty`)
);

CREATE INDEX `fq_user_id_idx` ON `favorite_quizzes` (`user_id`);
CREATE INDEX `fq_category_idx` ON `favorite_quizzes` (`category`);
CREATE INDEX `fq_favorited_at_idx` ON `favorite_quizzes` (`favorited_at`);
