-- Create deck_flashcards junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `deck_flashcards` (
  `deck_id` int NOT NULL,
  `flashcard_id` int NOT NULL,
  `position` int DEFAULT 0,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`deck_id`, `flashcard_id`),
  CONSTRAINT `deck_flashcards_deck_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks`(`id`) ON DELETE CASCADE,
  CONSTRAINT `deck_flashcards_flashcard_id_fk` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX `df_deck_id_idx` ON `deck_flashcards` (`deck_id`);
CREATE INDEX `df_flashcard_id_idx` ON `deck_flashcards` (`flashcard_id`);
CREATE INDEX `df_position_idx` ON `deck_flashcards` (`deck_id`, `position`);
