ALTER TABLE `candidate_profiles` ADD `weeklyDigestEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `weeklyDigestCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `weeklyDigestLastSentAt` timestamp;