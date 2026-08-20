CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`href` varchar(300),
	`fingerprint` varchar(180) NOT NULL,
	`readAt` timestamp,
	`dismissedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_user_fingerprint_unique` UNIQUE(`userId`,`fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);