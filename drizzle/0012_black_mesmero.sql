CREATE TABLE `weekly_digest_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodKey` varchar(16) NOT NULL,
	`status` enum('processing','delivered','failed') NOT NULL DEFAULT 'processing',
	`emailStatus` enum('pending_provider','sent','failed','not_requested') NOT NULL DEFAULT 'pending_provider',
	`recommendationCount` int NOT NULL DEFAULT 0,
	`failureReason` varchar(500),
	`inAppDeliveredAt` timestamp,
	`emailDeliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_digest_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_digest_delivery_user_period_unique` UNIQUE(`userId`,`periodKey`)
);
--> statement-breakpoint
CREATE INDEX `weekly_digest_delivery_status_idx` ON `weekly_digest_deliveries` (`status`);