CREATE TABLE `content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`content_record_id` text NOT NULL,
	`editor_id` text NOT NULL,
	`discussion_topic_id` text,
	`revision` integer NOT NULL,
	`workflow_status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`access_level` text DEFAULT 'member' NOT NULL,
	`is_commercial` integer DEFAULT false NOT NULL,
	`commercial_disclosure` text,
	`change_note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`content_record_id`) REFERENCES `content_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`discussion_topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_revisions_record_revision` ON `content_revisions` (`content_record_id`,`revision`);--> statement-breakpoint
CREATE INDEX `idx_content_revisions_status_created` ON `content_revisions` (`workflow_status`,`created_at`);