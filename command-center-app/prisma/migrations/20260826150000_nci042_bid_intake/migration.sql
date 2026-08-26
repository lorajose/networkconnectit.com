-- NCI-042 Estimating Workspace & Bid Document Intake
-- Tenant isolation invariant: every bid/document row carries organizationId.
-- Binary content remains in private object storage; this schema stores metadata and storage keys only.

CREATE TABLE `BidWorkspace` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NULL,
  `estimateId` VARCHAR(191) NULL,
  `bidNumber` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','REVIEW','READY_TO_ESTIMATE','SUBMITTED','WON','LOST','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `revision` VARCHAR(64) NULL,
  `bidDueAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `BidWorkspace_org_number_key` (`organizationId`, `bidNumber`),
  INDEX `BidWorkspace_org_project_idx` (`organizationId`, `projectInstallationId`),
  INDEX `BidWorkspace_org_estimate_idx` (`organizationId`, `estimateId`),
  INDEX `BidWorkspace_org_due_idx` (`organizationId`, `bidDueAt`),
  CONSTRAINT `BidWorkspace_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BidWorkspace_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `BidWorkspace_estimateId_fkey` FOREIGN KEY (`estimateId`) REFERENCES `Estimate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BidDocument` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `bidWorkspaceId` VARCHAR(191) NOT NULL,
  `documentType` ENUM('DRAWING','SPECIFICATION','SCOPE','ADDENDUM','VENDOR_QUOTE','SUBCONTRACTOR_QUOTE','OTHER') NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `revision` VARCHAR(64) NULL,
  `sourceKey` VARCHAR(512) NOT NULL,
  `sourceMimeType` VARCHAR(128) NULL,
  `sourceSizeBytes` BIGINT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `BidDocument_workspace_source_key` (`bidWorkspaceId`, `sourceKey`),
  INDEX `BidDocument_org_workspace_idx` (`organizationId`, `bidWorkspaceId`),
  INDEX `BidDocument_org_type_idx` (`organizationId`, `documentType`),
  CONSTRAINT `BidDocument_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BidDocument_bidWorkspaceId_fkey` FOREIGN KEY (`bidWorkspaceId`) REFERENCES `BidWorkspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
