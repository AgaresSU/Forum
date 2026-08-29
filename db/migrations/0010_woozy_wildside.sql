CREATE TABLE `partner_referral_clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`user_id` text NOT NULL,
	`day_bucket` integer NOT NULL,
	`source` text DEFAULT 'catalog' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `partner_programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_partner_clicks_program_user_day` ON `partner_referral_clicks` (`program_id`,`user_id`,`day_bucket`);--> statement-breakpoint
CREATE INDEX `idx_partner_clicks_program_created` ON `partner_referral_clicks` (`program_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_partner_clicks_user_created` ON `partner_referral_clicks` (`user_id`,`created_at`);