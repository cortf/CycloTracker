CREATE TABLE `outbreak_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`ingest_id` integer,
	`dedupe_key` text NOT NULL,
	`state_fips` text,
	`state_name` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer,
	`etiology` text,
	`etiology_status` text,
	`primary_mode` text,
	`setting` text,
	`illnesses` integer,
	`hospitalizations` integer,
	`deaths` integer,
	`food_vehicle` text,
	`food_contaminated_ingredient` text,
	`ifsac_category` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingest_id`) REFERENCES `raw_ingests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`state_fips`) REFERENCES `states`(`fips`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbreak_records_dedupe_key_unique` ON `outbreak_records` (`dedupe_key`);