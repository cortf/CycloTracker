CREATE TABLE `case_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`ingest_id` integer,
	`state_fips` text NOT NULL,
	`state_name` text NOT NULL,
	`year` integer NOT NULL,
	`week` integer,
	`count_type` text NOT NULL,
	`case_count` integer,
	`flag` text,
	`status` text NOT NULL,
	`confidence` text DEFAULT 'medium' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingest_id`) REFERENCES `raw_ingests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`state_fips`) REFERENCES `states`(`fips`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_records_natural_key` ON `case_records` (`source_id`,`state_fips`,`year`,`week`,`count_type`);--> statement-breakpoint
CREATE INDEX `case_records_state_year_idx` ON `case_records` (`state_fips`,`year`);--> statement-breakpoint
CREATE TABLE `raw_ingests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`fetched_at` text NOT NULL,
	`request_url` text NOT NULL,
	`http_status` integer,
	`content_hash` text NOT NULL,
	`row_count` integer,
	`payload` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `raw_ingests_source_fetched_idx` ON `raw_ingests` (`source_id`,`fetched_at`);--> statement-breakpoint
CREATE INDEX `raw_ingests_hash_idx` ON `raw_ingests` (`content_hash`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`category` text NOT NULL,
	`format` text,
	`license` text,
	`update_cadence` text,
	`precedence` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_key_unique` ON `sources` (`key`);--> statement-breakpoint
CREATE TABLE `state_population` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state_fips` text NOT NULL,
	`year` integer NOT NULL,
	`population` integer NOT NULL,
	`source_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`state_fips`) REFERENCES `states`(`fips`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `state_population_natural_key` ON `state_population` (`state_fips`,`year`,`source_id`);--> statement-breakpoint
CREATE TABLE `states` (
	`fips` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`usps` text NOT NULL,
	`type` text NOT NULL,
	`is_mappable` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `states_usps_unique` ON `states` (`usps`);