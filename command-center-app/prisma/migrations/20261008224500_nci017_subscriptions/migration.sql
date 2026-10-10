-- NCI-017: organization-scoped recurring subscription persistence.
-- Provider events are idempotent and remain the authority for paid access.

CREATE TABLE `OrganizationSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `providerCustomerId` VARCHAR(191) NOT NULL,
    `providerSubscriptionId` VARCHAR(191) NOT NULL,
    `plan` ENUM('PRO', 'BUSINESS') NOT NULL,
    `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE') NOT NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OrgSubscription_org_key`(`organizationId`),
    UNIQUE INDEX `OrgSubscription_provider_sub_key`(`provider`, `providerSubscriptionId`),
    INDEX `OrgSubscription_provider_customer_idx`(`provider`, `providerCustomerId`),
    INDEX `OrgSubscription_status_period_end_idx`(`status`, `currentPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrganizationSubscriptionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `providerEventId` VARCHAR(191) NOT NULL,
    `providerSubscriptionId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(96) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrgSubEvent_provider_event_key`(`provider`, `providerEventId`),
    INDEX `OrgSubEvent_org_received_idx`(`organizationId`, `receivedAt`),
    INDEX `OrgSubEvent_provider_sub_idx`(`provider`, `providerSubscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OrganizationSubscription`
    ADD CONSTRAINT `OrgSubscription_org_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OrganizationSubscriptionEvent`
    ADD CONSTRAINT `OrgSubEvent_org_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
