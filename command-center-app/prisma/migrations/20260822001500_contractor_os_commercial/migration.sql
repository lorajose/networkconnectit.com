-- Contractor OS commercial persistence
-- Tenant isolation invariant: every commercial row carries organizationId and is queried with it.

CREATE TABLE `Estimate` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NULL,
  `estimateNumber` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','READY','SUPERSEDED','ACCEPTED') NOT NULL DEFAULT 'DRAFT',
  `markupPercent` DECIMAL(9,4) NOT NULL DEFAULT 0,
  `taxPercent` DECIMAL(9,4) NOT NULL DEFAULT 0,
  `laborBurdenPercent` DECIMAL(9,4) NOT NULL DEFAULT 0,
  `contingencyPercent` DECIMAL(9,4) NOT NULL DEFAULT 0,
  `discountAmount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `directCost` DECIMAL(12,2) NOT NULL,
  `sellSubtotal` DECIMAL(12,2) NOT NULL,
  `taxAmount` DECIMAL(12,2) NOT NULL,
  `total` DECIMAL(12,2) NOT NULL,
  `grossProfit` DECIMAL(12,2) NOT NULL,
  `marginPercent` DECIMAL(9,4) NOT NULL,
  `calculationSnapshot` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Estimate_org_number_key` (`organizationId`, `estimateNumber`),
  INDEX `Estimate_org_project_idx` (`organizationId`, `projectInstallationId`),
  CONSTRAINT `Estimate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Estimate_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EstimateLine` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `estimateId` VARCHAR(191) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `type` VARCHAR(32) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(14,4) NOT NULL,
  `unit` VARCHAR(32) NULL,
  `unitCost` DECIMAL(12,4) NOT NULL,
  `unitPrice` DECIMAL(12,4) NULL,
  `taxable` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `EstimateLine_org_estimate_idx` (`organizationId`, `estimateId`),
  CONSTRAINT `EstimateLine_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `EstimateLine_estimateId_fkey` FOREIGN KEY (`estimateId`) REFERENCES `Estimate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Proposal` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NULL,
  `estimateId` VARCHAR(191) NOT NULL,
  `proposalNumber` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','READY','SENT','VIEWED','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `currentVersion` INT NOT NULL DEFAULT 1,
  `sentAt` DATETIME(3) NULL,
  `viewedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Proposal_org_number_key` (`organizationId`, `proposalNumber`),
  INDEX `Proposal_org_project_idx` (`organizationId`, `projectInstallationId`),
  INDEX `Proposal_org_status_idx` (`organizationId`, `status`),
  CONSTRAINT `Proposal_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Proposal_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Proposal_estimateId_fkey` FOREIGN KEY (`estimateId`) REFERENCES `Estimate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProposalVersion` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `proposalId` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `customerSubtotal` DECIMAL(12,2) NOT NULL,
  `customerTax` DECIMAL(12,2) NOT NULL,
  `customerTotal` DECIMAL(12,2) NOT NULL,
  `documentSnapshot` JSON NOT NULL,
  `snapshotHash` VARCHAR(128) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProposalVersion_proposal_version_key` (`proposalId`, `version`),
  INDEX `ProposalVersion_org_proposal_idx` (`organizationId`, `proposalId`),
  CONSTRAINT `ProposalVersion_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProposalVersion_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ApprovalReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `proposalId` VARCHAR(191) NOT NULL,
  `proposalVersionId` VARCHAR(191) NOT NULL,
  `approvedByName` VARCHAR(191) NOT NULL,
  `approvedByEmail` VARCHAR(191) NULL,
  `approvedAmount` DECIMAL(12,2) NOT NULL,
  `acceptanceText` TEXT NOT NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(512) NULL,
  `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ApprovalReceipt_proposal_key` (`proposalId`),
  INDEX `ApprovalReceipt_org_proposal_idx` (`organizationId`, `proposalId`),
  CONSTRAINT `ApprovalReceipt_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ApprovalReceipt_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ApprovalReceipt_proposalVersionId_fkey` FOREIGN KEY (`proposalVersionId`) REFERENCES `ProposalVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
