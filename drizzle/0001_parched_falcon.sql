CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`status` enum('saved','applied','interviewing','offer','rejected') NOT NULL DEFAULT 'saved',
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `applications_user_job_unique` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`headline` varchar(180) DEFAULT '',
	`bio` text,
	`desiredRoles` json NOT NULL,
	`desiredLocations` json NOT NULL,
	`workPreference` enum('remote','hybrid','onsite','flexible') NOT NULL DEFAULT 'flexible',
	`employmentPreference` enum('internship','full_time','both') NOT NULL DEFAULT 'both',
	`experienceLevel` enum('student','entry','mid','senior') NOT NULL DEFAULT 'entry',
	`skills` json NOT NULL,
	`experience` json NOT NULL,
	`education` json NOT NULL,
	`profileConfirmed` boolean NOT NULL DEFAULT false,
	`onboardingStep` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `career_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topSkills` json NOT NULL,
	`skillGaps` json NOT NULL,
	`nextActions` json NOT NULL,
	`narrative` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `career_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`company` varchar(180) NOT NULL,
	`location` varchar(180) NOT NULL,
	`workMode` enum('remote','hybrid','onsite') NOT NULL,
	`employmentType` enum('internship','full_time') NOT NULL,
	`experienceLevel` enum('student','entry','mid','senior') NOT NULL,
	`salaryRange` varchar(100),
	`description` text NOT NULL,
	`requirements` json NOT NULL,
	`niceToHave` json NOT NULL,
	`applicationUrl` varchar(500),
	`postedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`score` int NOT NULL,
	`explanation` text NOT NULL,
	`matchingSkills` json NOT NULL,
	`missingSkills` json NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendations_user_job_unique` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(700) NOT NULL,
	`sizeBytes` int NOT NULL,
	`status` enum('uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploaded',
	`extraction` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_jobs_user_job_unique` UNIQUE(`userId`,`jobId`)
);
--> statement-breakpoint
CREATE INDEX `career_insights_user_idx` ON `career_insights` (`userId`);--> statement-breakpoint
CREATE INDEX `jobs_location_idx` ON `jobs` (`location`);--> statement-breakpoint
CREATE INDEX `jobs_title_idx` ON `jobs` (`title`);--> statement-breakpoint
CREATE INDEX `recommendations_user_idx` ON `recommendations` (`userId`);--> statement-breakpoint
CREATE INDEX `resumes_user_idx` ON `resumes` (`userId`);