-- Add refresh tokens table for session management
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `token` varchar(500) NOT NULL UNIQUE,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` timestamp NULL,
  `ip_address` varchar(50) NULL,
  `user_agent` text NULL,
  INDEX `rt_user_id_idx` (`user_id`),
  INDEX `rt_token_idx` (`token`),
  INDEX `rt_expires_at_idx` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
