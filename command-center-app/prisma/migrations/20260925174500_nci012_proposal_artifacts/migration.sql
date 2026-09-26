-- NCI-012 proposal artifact and lifecycle analytics.
-- Tenant isolation invariant: every row carries organizationId.

CREATE TABLE `ProposalArtifact` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `proposalId` VARCHAR(191) NOT NULL,
  `proposalVersionId` VARCHAR(191) NOT NULL,
  `artifactType` VARCHAR(32) NOT NULL,
  `storageKey` VARCHAR(768) NOT NULL,
  `contentType` VARCHAR(128) NOT NULL,
  `byteSize` BIGINT NOT NULL,
  `snapshotHash` VARCHAR(128) NOT NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProposalArtifact_org_proposal_idx` (`organizationId`, `proposalId`, `proposalVersionId`),
  CONSTRAINT `ProposalArtifact_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProposalArtifact_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProposalArtifact_proposalVersionId_fkey` FOREIGN KEY (`proposalVersionId`) REFERENCES `ProposalVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProposalEvent` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `proposalId` VARCHAR(191) NOT NULL,
  `proposalVersionId` VARCHAR(191) NULL,
  `eventType` VARCHAR(64) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProposalEvent_org_proposal_event_idx` (`organizationId`, `proposalId`, `eventType`, `createdAt`),
  CONSTRAINT `ProposalEvent_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProposalEvent_proposalId_fkey` FOREIGN KEY (`proposalId`) REFERENCES `Proposal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProposalEvent_proposalVersionId_fkey` FOREIGN KEY (`proposalVersionId`) REFERENCES `ProposalVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
