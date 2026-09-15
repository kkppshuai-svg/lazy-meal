CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text DEFAULT 'idea' NOT NULL,
	`content` text NOT NULL,
	`contact` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_status_created_idx` ON `feedback` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_owner_created_idx` ON `feedback` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`event_name` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_event_owner_created_idx` ON `product_events` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_event_name_created_idx` ON `product_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `scan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_hash` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`model` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scan_owner_created_idx` ON `scan_events` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `scan_client_created_idx` ON `scan_events` (`client_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `scan_status_created_idx` ON `scan_events` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_email_unique` ON `user_profiles` (`email`);