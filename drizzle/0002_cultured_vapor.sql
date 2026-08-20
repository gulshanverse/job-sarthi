ALTER TABLE `candidate_profiles` ADD `fullName` varchar(180) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `currentLocation` varchar(180);--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `linkedInUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `githubUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `projects` json;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `certifications` json;--> statement-breakpoint
ALTER TABLE `resumes` ADD `fileHash` varchar(64);--> statement-breakpoint
ALTER TABLE `resumes` ADD `failureReason` varchar(500);--> statement-breakpoint
ALTER TABLE `resumes` ADD `processedAt` timestamp;--> statement-breakpoint
ALTER TABLE `resumes` ADD CONSTRAINT `resumes_user_hash_unique` UNIQUE(`userId`,`fileHash`);
