CREATE TABLE `user_administration_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`target_user_id` text,
	`actor_user_id` text,
	`target_username` text NOT NULL,
	`action` text NOT NULL,
	`previous_role` text,
	`new_role` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_user_admin_audit_created` ON `user_administration_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_admin_audit_target` ON `user_administration_audit` (`target_user_id`,`created_at`);