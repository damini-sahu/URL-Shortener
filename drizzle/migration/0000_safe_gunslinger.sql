CREATE TABLE `oauth_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` enum('google','github') NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_accounts_provider_account_id_unique` UNIQUE(`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`valid` boolean NOT NULL DEFAULT true,
	`user_agent` text,
	`ip` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `short_link` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(255) NOT NULL,
	`short_code` varchar(20) NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `short_link_id` PRIMARY KEY(`id`),
	CONSTRAINT `short_link_short_code_unique` UNIQUE(`short_code`)
);
--> statement-breakpoint
CREATE TABLE `users_register` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255),
	`avatar_url` text,
	`is_email_valid` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_register_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_register_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `is_email_valid` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(8) NOT NULL,
	`expires_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 DAY),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `is_email_valid_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_register_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_register`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_register_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_register`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_register_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_register`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `short_link` ADD CONSTRAINT `short_link_user_id_users_register_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_register`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `is_email_valid` ADD CONSTRAINT `is_email_valid_user_id_users_register_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_register`(`id`) ON DELETE cascade ON UPDATE no action;