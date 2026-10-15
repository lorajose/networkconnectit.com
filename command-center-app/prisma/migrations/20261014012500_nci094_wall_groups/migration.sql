-- NCI-094: single-player three-zone MenuBoard wall persistence.
-- Source-controlled only. Do not apply to production without explicit authorization.

CREATE TABLE `MenuBoardDisplayGroup` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `siteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `playerTokenHash` VARCHAR(64) NULL,
  `playerTokenIssuedAt` DATETIME(3) NULL,
  `playerTokenRevokedAt` DATETIME(3) NULL,
  `lastSeenAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `MenuBoardDisplayGroup_playerTokenHash_key`(`playerTokenHash`),
  UNIQUE INDEX `MenuBoardDisplayGroup_siteId_name_key`(`siteId`, `name`),
  INDEX `MenuBoardDisplayGroup_organizationId_siteId_idx`(`organizationId`, `siteId`),
  INDEX `MenuBoardDisplayGroup_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardPromotionCampaign` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `siteId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `MenuBoardPromotionCampaign_siteId_name_key`(`siteId`, `name`),
  INDEX `MenuBoardPromotionCampaign_organizationId_siteId_idx`(`organizationId`, `siteId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardPromotionSlide` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `headline` VARCHAR(191) NOT NULL,
  `body` TEXT NULL,
  `offerText` VARCHAR(191) NULL,
  `mediaUrl` VARCHAR(512) NULL,
  `durationSeconds` INTEGER NOT NULL DEFAULT 10,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `MenuBoardPromotionSlide_organizationId_campaignId_idx`(`organizationId`, `campaignId`),
  INDEX `MenuBoardPromotionSlide_campaignId_sortOrder_idx`(`campaignId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardPromotionPublish` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `publishedByUserId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `payload` JSON NOT NULL,
  `payloadHash` VARCHAR(64) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `MenuBoardPromotionPublish_campaignId_version_key`(`campaignId`, `version`),
  INDEX `MenuBoardPromotionPublish_organizationId_campaignId_idx`(`organizationId`, `campaignId`),
  INDEX `MenuBoardPromotionPublish_publishedAt_idx`(`publishedAt`),
  INDEX `MenuBoardPromotionPublish_publishedByUserId_idx`(`publishedByUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardDisplayZone` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `displayGroupId` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL,
  `role` ENUM('MENU_PRIMARY', 'MENU_SECONDARY', 'PROMOTION') NOT NULL,
  `contentType` ENUM('MENU', 'PROMOTION') NOT NULL,
  `menuId` VARCHAR(191) NULL,
  `activeMenuPublishId` VARCHAR(191) NULL,
  `promotionCampaignId` VARCHAR(191) NULL,
  `activePromotionPublishId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `MenuBoardDisplayZone_displayGroupId_position_key`(`displayGroupId`, `position`),
  UNIQUE INDEX `MenuBoardDisplayZone_displayGroupId_role_key`(`displayGroupId`, `role`),
  INDEX `MenuBoardDisplayZone_organizationId_displayGroupId_idx`(`organizationId`, `displayGroupId`),
  INDEX `MenuBoardDisplayZone_menuId_idx`(`menuId`),
  INDEX `MenuBoardDisplayZone_activeMenuPublishId_idx`(`activeMenuPublishId`),
  INDEX `MenuBoardDisplayZone_promotionCampaignId_idx`(`promotionCampaignId`),
  INDEX `MenuBoardDisplayZone_activePromotionPublishId_idx`(`activePromotionPublishId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardWallHeartbeat` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `displayGroupId` VARCHAR(191) NOT NULL,
  `playerVersion` VARCHAR(64) NULL,
  `manifestHash` VARCHAR(64) NULL,
  `displayedZones` JSON NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `MenuBoardWallHeartbeat_organizationId_displayGroupId_idx`(`organizationId`, `displayGroupId`),
  INDEX `MenuBoardWallHeartbeat_displayGroupId_receivedAt_idx`(`displayGroupId`, `receivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MenuBoardWallPairingCode` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `displayGroupId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `MenuBoardWallPairingCode_codeHash_key`(`codeHash`),
  INDEX `MenuBoardWallPairingCode_organizationId_displayGroupId_idx`(`organizationId`, `displayGroupId`),
  INDEX `MenuBoardWallPairingCode_displayGroupId_expiresAt_idx`(`displayGroupId`, `expiresAt`),
  INDEX `MenuBoardWallPairingCode_expiresAt_consumedAt_idx`(`expiresAt`, `consumedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MenuBoardDisplayGroup`
  ADD CONSTRAINT `MenuBoardDisplayGroup_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayGroup_siteId_fkey`
  FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuBoardPromotionCampaign`
  ADD CONSTRAINT `MenuBoardPromotionCampaign_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardPromotionCampaign_siteId_fkey`
  FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuBoardPromotionSlide`
  ADD CONSTRAINT `MenuBoardPromotionSlide_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardPromotionSlide_campaignId_fkey`
  FOREIGN KEY (`campaignId`) REFERENCES `MenuBoardPromotionCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuBoardPromotionPublish`
  ADD CONSTRAINT `MenuBoardPromotionPublish_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardPromotionPublish_campaignId_fkey`
  FOREIGN KEY (`campaignId`) REFERENCES `MenuBoardPromotionCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardPromotionPublish_publishedByUserId_fkey`
  FOREIGN KEY (`publishedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `MenuBoardDisplayZone`
  ADD CONSTRAINT `MenuBoardDisplayZone_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayZone_displayGroupId_fkey`
  FOREIGN KEY (`displayGroupId`) REFERENCES `MenuBoardDisplayGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayZone_menuId_fkey`
  FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayZone_activeMenuPublishId_fkey`
  FOREIGN KEY (`activeMenuPublishId`) REFERENCES `MenuPublish`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayZone_promotionCampaignId_fkey`
  FOREIGN KEY (`promotionCampaignId`) REFERENCES `MenuBoardPromotionCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardDisplayZone_activePromotionPublishId_fkey`
  FOREIGN KEY (`activePromotionPublishId`) REFERENCES `MenuBoardPromotionPublish`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MenuBoardWallHeartbeat`
  ADD CONSTRAINT `MenuBoardWallHeartbeat_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardWallHeartbeat_displayGroupId_fkey`
  FOREIGN KEY (`displayGroupId`) REFERENCES `MenuBoardDisplayGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MenuBoardWallPairingCode`
  ADD CONSTRAINT `MenuBoardWallPairingCode_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `MenuBoardWallPairingCode_displayGroupId_fkey`
  FOREIGN KEY (`displayGroupId`) REFERENCES `MenuBoardDisplayGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
