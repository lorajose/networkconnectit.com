-- NCI-042 estimate source-evidence snapshots
-- Snapshots freeze the bid/document evidence used for a specific estimate version/handoff.

CREATE TABLE `EstimateEvidenceSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `estimateId` VARCHAR(191) NOT NULL,
  `bidWorkspaceId` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `bidRevision` VARCHAR(64) NULL,
  `evidenceSnapshot` JSON NOT NULL,
  `snapshotHash` VARCHAR(128) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `EstimateEvidence_estimate_version_key` (`estimateId`, `version`),
  INDEX `EstimateEvidence_org_estimate_idx` (`organizationId`, `estimateId`),
  INDEX `EstimateEvidence_org_bid_idx` (`organizationId`, `bidWorkspaceId`),
  CONSTRAINT `EstimateEvidence_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EstimateEvidence_estimateId_fkey` FOREIGN KEY (`estimateId`) REFERENCES `Estimate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EstimateEvidence_bidWorkspaceId_fkey` FOREIGN KEY (`bidWorkspaceId`) REFERENCES `BidWorkspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
