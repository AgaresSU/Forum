CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`topic_id` text,
	`report_id` text,
	`action` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `moderation_reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_actions_topic_created` ON `moderation_actions` (`topic_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_moderation_actions_report_created` ON `moderation_actions` (`report_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_user_id` text,
	`notification_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`href` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read_created` ON `notifications` (`user_id`,`is_read`,`created_at`);--> statement-breakpoint
ALTER TABLE `topics` ADD `assigned_to_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `topics` ADD `moderation_note` text;--> statement-breakpoint
ALTER TABLE `topics` ADD `moderation_decided_at` integer;--> statement-breakpoint
ALTER TABLE `topics` ADD `resubmission_count` integer DEFAULT 0 NOT NULL;