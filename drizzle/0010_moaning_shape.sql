CREATE TABLE `application_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `application_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `application_timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`body` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_timeline_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`userId` int NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`remindAt` timestamp NOT NULL,
	`title` varchar(180) NOT NULL,
	`notes` text,
	`status` enum('scheduled','sent','cancelled') NOT NULL DEFAULT 'scheduled',
	`scheduleCronTaskUid` varchar(65),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `interview_reminders_application_unique` UNIQUE(`applicationId`)
);
--> statement-breakpoint
CREATE TABLE `job_ingestion_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`triggeredByUserId` int,
	`status` enum('started','completed','partial','failed') NOT NULL DEFAULT 'started',
	`fetchedCount` int NOT NULL DEFAULT 0,
	`newCount` int NOT NULL DEFAULT 0,
	`updatedCount` int NOT NULL DEFAULT 0,
	`duplicateCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`errorSummary` varchar(1000),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_ingestion_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `status` enum('active','paused','closed','archived') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `highMatchNotificationsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `applicationUpdatesEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `interviewRemindersEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `skillInsightsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reviewStatus` enum('pending_review','approved','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `sourceProvider` varchar(80) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `sourceKey` varchar(240);--> statement-breakpoint
ALTER TABLE `jobs` ADD `externalJobId` varchar(180);--> statement-breakpoint
ALTER TABLE `jobs` ADD `sourceUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `jobs` ADD `importedAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `lastSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `jobs` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `jobs` ADD `rejectionReason` varchar(500);--> statement-breakpoint
ALTER TABLE `jobs` ADD `lastIngestionRunId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `jobId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `applicationId` int;--> statement-breakpoint
UPDATE `jobs` SET `sourceKey` = CONCAT('legacy-', `id`) WHERE `sourceKey` IS NULL;--> statement-breakpoint
ALTER TABLE `jobs` MODIFY COLUMN `sourceKey` varchar(240) NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_source_identity_unique` UNIQUE(`sourceProvider`,`sourceKey`);--> statement-breakpoint
CREATE INDEX `application_notes_application_idx` ON `application_notes` (`applicationId`);--> statement-breakpoint
CREATE INDEX `application_notes_user_idx` ON `application_notes` (`userId`);--> statement-breakpoint
CREATE INDEX `application_timeline_application_idx` ON `application_timeline_events` (`applicationId`);--> statement-breakpoint
CREATE INDEX `application_timeline_user_idx` ON `application_timeline_events` (`userId`);--> statement-breakpoint
CREATE INDEX `interview_reminders_user_due_idx` ON `interview_reminders` (`userId`,`remindAt`);--> statement-breakpoint
CREATE INDEX `interview_reminders_status_idx` ON `interview_reminders` (`status`);--> statement-breakpoint
CREATE INDEX `interview_reminders_cron_task_idx` ON `interview_reminders` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `job_ingestion_runs_provider_idx` ON `job_ingestion_runs` (`provider`);--> statement-breakpoint
CREATE INDEX `job_ingestion_runs_created_idx` ON `job_ingestion_runs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_review_status_idx` ON `jobs` (`reviewStatus`);--> statement-breakpoint
CREATE INDEX `jobs_source_provider_idx` ON `jobs` (`sourceProvider`);--> statement-breakpoint
CREATE INDEX `jobs_published_at_idx` ON `jobs` (`publishedAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `notifications_job_idx` ON `notifications` (`jobId`);--> statement-breakpoint
CREATE INDEX `notifications_application_idx` ON `notifications` (`applicationId`);
