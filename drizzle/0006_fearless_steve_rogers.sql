ALTER TABLE `jobs` ADD `responsibilities` json;--> statement-breakpoint
ALTER TABLE `jobs` ADD `category` varchar(120);--> statement-breakpoint
ALTER TABLE `jobs` ADD `requiredEducation` varchar(180);--> statement-breakpoint
ALTER TABLE `jobs` ADD `deadline` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `status` enum('active','paused','closed') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `skillScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `roleScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `experienceScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `educationScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `locationScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `preferenceScore` int DEFAULT 0 NOT NULL;