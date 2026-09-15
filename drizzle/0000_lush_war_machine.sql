CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '🥬' NOT NULL,
	`category` text DEFAULT '其他' NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT '份' NOT NULL,
	`min_quantity` real DEFAULT 0 NOT NULL,
	`estimated_expires_at` integer,
	`condition` text DEFAULT '看起来正常' NOT NULL,
	`confidence` real DEFAULT 0.6 NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inventory_owner_status_idx` ON `inventory_items` (`owner_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_owner_name_active_idx` ON `inventory_items` (`owner_id`,`name`,`status`);--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT '份' NOT NULL,
	`reason` text DEFAULT '手动添加' NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`auto_generated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shopping_owner_checked_idx` ON `shopping_items` (`owner_id`,`checked`);--> statement-breakpoint
CREATE UNIQUE INDEX `shopping_owner_name_idx` ON `shopping_items` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `user_stats` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`total_saved` integer DEFAULT 0 NOT NULL,
	`items_rescued` integer DEFAULT 0 NOT NULL,
	`meals_cooked` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
