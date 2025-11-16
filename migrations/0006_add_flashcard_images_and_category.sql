-- Add image fields and category to flashcards table
ALTER TABLE `flashcards` 
ADD COLUMN `question_image` TEXT AFTER `answer`,
ADD COLUMN `answer_image` TEXT AFTER `question_image`,
ADD COLUMN `category` VARCHAR(50) AFTER `tags`;

-- Add indexes for performance on flashcards table
CREATE INDEX `fc_category_idx` ON `flashcards` (`user_id`, `category`);
CREATE INDEX `fc_user_next_review_idx` ON `flashcards` (`user_id`, `next_review_date`);
