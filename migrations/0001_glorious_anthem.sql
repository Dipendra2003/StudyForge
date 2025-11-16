ALTER TABLE `users` ADD `email_verified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `verification_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `verification_token_expiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `reset_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `reset_token_expiry` timestamp;