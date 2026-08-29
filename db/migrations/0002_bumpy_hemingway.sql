CREATE TABLE `community_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_community_events_status_created` ON `community_events` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_group_members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`membership_role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `community_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_group_members_user_status` ON `community_group_members` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `community_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`visibility` text DEFAULT 'closed' NOT NULL,
	`minimum_role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_community_groups_slug` ON `community_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_community_groups_status_created` ON `community_groups` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_records` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`discussion_topic_id` text,
	`content_type` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`access_level` text DEFAULT 'member' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`is_commercial` integer DEFAULT false NOT NULL,
	`commercial_disclosure` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`discussion_topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_records_slug` ON `content_records` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_content_records_type_status_published` ON `content_records` (`content_type`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_content_records_author_created` ON `content_records` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `forum_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`node_type` text DEFAULT 'forum' NOT NULL,
	`icon_key` text,
	`position` integer DEFAULT 0 NOT NULL,
	`minimum_role` text DEFAULT 'member' NOT NULL,
	`requires_moderation` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `forum_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_forum_nodes_slug` ON `forum_nodes` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_forum_nodes_parent_position` ON `forum_nodes` (`parent_id`,`position`);--> statement-breakpoint
CREATE TABLE `forum_subscriptions` (
	`user_id` text NOT NULL,
	`forum_id` text NOT NULL,
	`notification_mode` text DEFAULT 'in_app' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `forum_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`forum_id`) REFERENCES `forum_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_forum_subscriptions_forum` ON `forum_subscriptions` (`forum_id`);--> statement-breakpoint
CREATE TABLE `moderation_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`assigned_to_id` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_reports_status_created` ON `moderation_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_moderation_reports_target` ON `moderation_reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`is_first_post` integer DEFAULT false NOT NULL,
	`edited_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_posts_topic_created` ON `posts` (`topic_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_author_created` ON `posts` (`author_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `topic_subscriptions` (
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`notification_mode` text DEFAULT 'in_app' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `topic_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_topic_subscriptions_topic` ON `topic_subscriptions` (`topic_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`forum_id` text NOT NULL,
	`author_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`access_level` text DEFAULT 'member' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`is_commercial` integer DEFAULT false NOT NULL,
	`commercial_disclosure` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`last_post_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`forum_id`) REFERENCES `forum_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_topics_slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_topics_forum_status_last_post` ON `topics` (`forum_id`,`status`,`last_post_at`);--> statement-breakpoint
CREATE INDEX `idx_topics_author_created` ON `topics` (`author_id`,`created_at`);