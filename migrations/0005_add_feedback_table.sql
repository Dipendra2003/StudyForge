-- Create feedback table for message reactions
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `feedback_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX `fb_user_id_idx` ON `feedback` (`user_id`);
CREATE INDEX `fb_message_id_idx` ON `feedback` (`message_id`);
CREATE INDEX `fb_type_idx` ON `feedback` (`type`);
