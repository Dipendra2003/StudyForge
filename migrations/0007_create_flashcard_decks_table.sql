-- Create flashcard_decks table for organizing flashcards into decks
CREATE TABLE IF NOT EXISTS `flashcard_decks` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_public` boolean DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `flashcard_decks_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX `fd_user_id_idx` ON `flashcard_decks` (`user_id`);
CREATE INDEX `fd_name_idx` ON `flashcard_decks` (`name`);
