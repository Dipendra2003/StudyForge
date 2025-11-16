CREATE INDEX `users_verification_token_idx` ON `users` (`verification_token`);--> statement-breakpoint
CREATE INDEX `users_reset_token_idx` ON `users` (`reset_token`);