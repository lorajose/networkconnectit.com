-- NCI-017: server-owned 30-day Pro trial persistence.
-- Kept migration-backed (rather than rewriting the generated Prisma model surface)
-- so existing Project Pass / project relations remain untouched.

CREATE TABLE `OrganizationSubscriptionTrial` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `plan` ENUM('PRO') NOT NULL DEFAULT 'PRO',
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrganizationSubscriptionTrial_organizationId_key`(`organizationId`),
    INDEX `OrganizationSubscriptionTrial_endsAt_idx`(`endsAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `OrganizationSubscriptionTrial_organizationId_fkey`
      FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
