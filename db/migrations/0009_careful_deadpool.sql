CREATE TABLE `reputation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`recipient_user_id` text,
	`actor_username` text NOT NULL,
	`recipient_username` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`previous_reaction_type` text,
	`reaction_type` text,
	`score_delta` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reputation_events_actor_created` ON `reputation_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reputation_events_recipient_created` ON `reputation_events` (`recipient_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reputation_events_target_created` ON `reputation_events` (`target_type`,`target_id`,`created_at`);