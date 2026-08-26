CREATE TABLE `TakeoffWorkspace` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `bidWorkspaceId` VARCHAR(191) NULL,
  `estimateId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TakeoffWorkspace_org_idx` (`organizationId`),
  INDEX `TakeoffWorkspace_bid_idx` (`bidWorkspaceId`),
  INDEX `TakeoffWorkspace_estimate_idx` (`estimateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TakeoffItem` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `takeoffWorkspaceId` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `itemCode` VARCHAR(191) NULL,
  `description` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(32) NOT NULL DEFAULT 'EA',
  `countedQuantity` DECIMAL(12,3) NOT NULL,
  `overrideQuantity` DECIMAL(12,3) NULL,
  `sheetReference` VARCHAR(191) NULL,
  `drawingRevision` VARCHAR(64) NULL,
  `notes` TEXT NULL,
  `source` VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TakeoffItem_org_workspace_idx` (`organizationId`, `takeoffWorkspaceId`),
  INDEX `TakeoffItem_category_idx` (`category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TakeoffBomItem` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `takeoffWorkspaceId` VARCHAR(191) NOT NULL,
  `takeoffItemId` VARCHAR(191) NULL,
  `catalogCode` VARCHAR(191) NULL,
  `description` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(32) NOT NULL DEFAULT 'EA',
  `generatedQuantity` DECIMAL(12,3) NOT NULL,
  `overrideQuantity` DECIMAL(12,3) NULL,
  `costRuleKey` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TakeoffBomItem_org_workspace_idx` (`organizationId`, `takeoffWorkspaceId`),
  INDEX `TakeoffBomItem_takeoff_item_idx` (`takeoffItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
