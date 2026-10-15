-- NCI-083 MenuBoard v1 foundation
-- Source-controlled only. Do not apply to production without explicit release authorization.

CREATE TABLE `MenuBoardScreen` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `siteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `orientation` ENUM('LANDSCAPE','PORTRAIT') NOT NULL DEFAULT 'LANDSCAPE',
  `widthPx` INTEGER NOT NULL DEFAULT 1920,
  `heightPx` INTEGER NOT NULL DEFAULT 1080,
  `status` ENUM('UNPAIRED','ONLINE','STALE','OFFLINE','REVOKED') NOT NULL DEFAULT 'UNPAIRED',
  `playerTokenHash` VARCHAR(64) NULL,
  `playerTokenIssuedAt` DATETIME(3) NULL,
  `playerTokenRevokedAt` DATETIME(3) NULL,
  `lastSeenAt` DATETIME(3) NULL,
  `displayedPublishVersion` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MenuBoardScreen_playerTokenHash_key`(`playerTokenHash`),
  UNIQUE INDEX `MenuBoardScreen_siteId_name_key`(`siteId`, `name`),
  INDEX `MenuBoardScreen_organizationId_siteId_idx`(`organizationId`, `siteId`),
  INDEX `MenuBoardScreen_organizationId_status_idx`(`organizationId`, `status`),
  INDEX `MenuBoardScreen_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Menu` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `siteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `templateKey` VARCHAR(64) NOT NULL DEFAULT 'DELI_LANDSCAPE_V1',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Menu_siteId_name_key`(`siteId`, `name`),
  INDEX `Menu_organizationId_siteId_idx`(`organizationId`, `siteId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuSection` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MenuSection_menuId_name_key`(`menuId`, `name`),
  INDEX `MenuSection_organizationId_menuId_idx`(`organizationId`, `menuId`),
  INDEX `MenuSection_menuId_sortOrder_idx`(`menuId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuItem` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `priceCents` INTEGER NOT NULL,
  `imageUrl` VARCHAR(512) NULL,
  `isAvailable` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MenuItem_organizationId_menuId_idx`(`organizationId`, `menuId`),
  INDEX `MenuItem_sectionId_sortOrder_idx`(`sectionId`, `sortOrder`),
  INDEX `MenuItem_menuId_isAvailable_idx`(`menuId`, `isAvailable`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuPublish` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `publishedByUserId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `payload` JSON NOT NULL,
  `payloadHash` VARCHAR(64) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MenuPublish_menuId_version_key`(`menuId`, `version`),
  INDEX `MenuPublish_organizationId_menuId_idx`(`organizationId`, `menuId`),
  INDEX `MenuPublish_publishedAt_idx`(`publishedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuScreenAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `screenId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MenuScreenAssignment_screenId_key`(`screenId`),
  INDEX `MenuScreenAssignment_organizationId_menuId_idx`(`organizationId`, `menuId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuPlayerHeartbeat` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `screenId` VARCHAR(191) NOT NULL,
  `playerVersion` VARCHAR(64) NULL,
  `publishVersion` INTEGER NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `MenuPlayerHeartbeat_organizationId_screenId_idx`(`organizationId`, `screenId`),
  INDEX `MenuPlayerHeartbeat_screenId_receivedAt_idx`(`screenId`, `receivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MenuBoardScreen` ADD CONSTRAINT `MenuBoardScreen_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuBoardScreen` ADD CONSTRAINT `MenuBoardScreen_siteId_fkey`
  FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Menu` ADD CONSTRAINT `Menu_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Menu` ADD CONSTRAINT `Menu_siteId_fkey`
  FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuSection` ADD CONSTRAINT `MenuSection_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuSection` ADD CONSTRAINT `MenuSection_menuId_fkey`
  FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_menuId_fkey`
  FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_sectionId_fkey`
  FOREIGN KEY (`sectionId`) REFERENCES `MenuSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuPublish` ADD CONSTRAINT `MenuPublish_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuPublish` ADD CONSTRAINT `MenuPublish_menuId_fkey`
  FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuPublish` ADD CONSTRAINT `MenuPublish_publishedByUserId_fkey`
  FOREIGN KEY (`publishedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `MenuScreenAssignment` ADD CONSTRAINT `MenuScreenAssignment_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuScreenAssignment` ADD CONSTRAINT `MenuScreenAssignment_screenId_fkey`
  FOREIGN KEY (`screenId`) REFERENCES `MenuBoardScreen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuScreenAssignment` ADD CONSTRAINT `MenuScreenAssignment_menuId_fkey`
  FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuPlayerHeartbeat` ADD CONSTRAINT `MenuPlayerHeartbeat_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuPlayerHeartbeat` ADD CONSTRAINT `MenuPlayerHeartbeat_screenId_fkey`
  FOREIGN KEY (`screenId`) REFERENCES `MenuBoardScreen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
