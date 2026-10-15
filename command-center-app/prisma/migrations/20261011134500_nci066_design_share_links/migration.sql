-- NCI-066 secure tokenized client design sharing.
-- Raw share tokens are never persisted; only SHA-256 token hashes are stored.
-- publicSnapshotJson is a client-safe frozen projection and contains no tenant-internal ids.

CREATE TABLE `DesignShareLink` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `reportDigest` VARCHAR(128) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `passwordHash` VARCHAR(255) NULL,
  `profileJson` JSON NOT NULL,
  `publicSnapshotJson` JSON NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `DesignShareLink_tokenHash_key` (`tokenHash`),
  INDEX `DesignShareLink_org_project_idx` (`organizationId`, `projectId`),
  INDEX `DesignShareLink_expiry_idx` (`expiresAt`, `revokedAt`),
  CONSTRAINT `DesignShareLink_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DesignShareLink_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DesignShareAuditEvent` (
  `id` VARCHAR(191) NOT NULL,
  `shareId` VARCHAR(191) NULL,
  `eventType` VARCHAR(32) NOT NULL,
  `detail` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `DesignShareAuditEvent_share_created_idx` (`shareId`, `createdAt`),
  INDEX `DesignShareAuditEvent_event_created_idx` (`eventType`, `createdAt`),
  CONSTRAINT `DesignShareAuditEvent_shareId_fkey` FOREIGN KEY (`shareId`) REFERENCES `DesignShareLink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;