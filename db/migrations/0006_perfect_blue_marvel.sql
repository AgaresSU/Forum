CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reactions_user_target` ON `reactions` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_reactions_target` ON `reactions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_reactions_user_created` ON `reactions` (`user_id`,`created_at`);