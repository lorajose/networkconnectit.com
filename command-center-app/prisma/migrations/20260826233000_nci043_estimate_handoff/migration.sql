ALTER TABLE `TakeoffBomItem`
  ADD COLUMN `lineType` VARCHAR(32) NOT NULL DEFAULT 'MATERIAL',
  ADD COLUMN `unitCostOverride` DECIMAL(12,4) NULL;

ALTER TABLE `EstimateLine`
  ADD COLUMN `sourceTakeoffWorkspaceId` VARCHAR(191) NULL,
  ADD COLUMN `sourceTakeoffBomItemId` VARCHAR(191) NULL,
  ADD INDEX `EstimateLine_takeoff_source_idx` (`organizationId`, `sourceTakeoffWorkspaceId`);

CREATE TABLE `TakeoffEstimateSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `takeoffWorkspaceId` VARCHAR(191) NOT NULL,
  `estimateId` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `snapshot` JSON NOT NULL,
  `snapshotHash` VARCHAR(128) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TakeoffEstimateSnapshot_workspace_version_key` (`takeoffWorkspaceId`, `version`),
  INDEX `TakeoffEstimateSnapshot_org_estimate_idx` (`organizationId`, `estimateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
