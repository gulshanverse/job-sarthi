CREATE TABLE `auth_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`rotatedFromSessionId` int,
	`userAgent` varchar(250),
	`ipHash` varchar(64),
	`expiresAt` timestamp NOT NULL,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `authStatus` enum('active','password_setup_required') DEFAULT 'password_setup_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `termsAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `password_reset_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `password_reset_expiry_idx` ON `password_reset_tokens` (`expiresAt`);