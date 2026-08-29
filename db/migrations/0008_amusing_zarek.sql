CREATE TABLE `partner_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`submitted_by_id` text NOT NULL,
	`reviewed_by_id` text,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`website_url` text NOT NULL,
	`referral_url` text NOT NULL,
	`reward_summary` text NOT NULL,
	`payout_terms` text NOT NULL,
	`commercial_disclosure` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderation_note` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_partner_programs_slug` ON `partner_programs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_partner_programs_status_updated` ON `partner_programs` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_partner_programs_submitter_created` ON `partner_programs` (`submitted_by_id`,`created_at`);