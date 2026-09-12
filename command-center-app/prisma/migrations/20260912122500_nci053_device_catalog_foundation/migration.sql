-- NCI-053: Security Device Catalog & Custom Device Library
-- Foundation: catalog identities + immutable revisions with tenant visibility and provenance.

CREATE TABLE `DeviceCatalogItem` (
  `id` VARCHAR(191) NOT NULL,
  `ownerOrganizationId` VARCHAR(191) NULL,
  `visibility` VARCHAR(32) NOT NULL DEFAULT 'ORGANIZATION_PRIVATE',
  `manufacturer` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `currentRevisionId` VARCHAR(191) NULL,
  `provenanceSource` VARCHAR(191) NOT NULL,
  `provenanceUrl` VARCHAR(500) NULL,
  `provenanceNotes` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `DeviceCatalogItem_ownerOrganizationId_idx` (`ownerOrganizationId`),
  INDEX `DeviceCatalogItem_visibility_category_idx` (`visibility`, `category`),
  INDEX `DeviceCatalogItem_manufacturer_model_idx` (`manufacturer`, `model`),
  INDEX `DeviceCatalogItem_status_idx` (`status`),
  CONSTRAINT `DeviceCatalogItem_ownerOrganizationId_fkey`
    FOREIGN KEY (`ownerOrganizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DeviceCatalogItem_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DeviceCatalogRevision` (
  `id` VARCHAR(191) NOT NULL,
  `catalogItemId` VARCHAR(191) NOT NULL,
  `revisionNumber` INTEGER NOT NULL,
  `revisionLabel` VARCHAR(191) NULL,
  `manufacturer` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL,

  `widthMm` DOUBLE NULL,
  `heightMm` DOUBLE NULL,
  `depthMm` DOUBLE NULL,
  `weightKg` DOUBLE NULL,

  `powerInput` VARCHAR(191) NULL,
  `maxPowerWatts` DOUBLE NULL,
  `poeRequired` BOOLEAN NULL,
  `poeStandard` VARCHAR(64) NULL,
  `poeClass` VARCHAR(64) NULL,

  `ethernetSpeedMbps` INTEGER NULL,
  `wirelessStandard` VARCHAR(64) NULL,
  `networkNotes` TEXT NULL,

  `cameraResolutionMp` DOUBLE NULL,
  `lensMinMm` DOUBLE NULL,
  `lensMaxMm` DOUBLE NULL,
  `horizontalFovDegrees` DOUBLE NULL,
  `verticalFovDegrees` DOUBLE NULL,
  `irRangeMeters` DOUBLE NULL,
  `sensorSize` VARCHAR(64) NULL,
  `videoCodecs` VARCHAR(255) NULL,

  `technicalAttributes` JSON NULL,
  `provenanceSource` VARCHAR(191) NOT NULL,
  `provenanceUrl` VARCHAR(500) NULL,
  `provenanceNotes` TEXT NULL,
  `effectiveFrom` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `DeviceCatalogRevision_catalogItemId_revisionNumber_key` (`catalogItemId`, `revisionNumber`),
  INDEX `DeviceCatalogRevision_category_idx` (`category`),
  INDEX `DeviceCatalogRevision_manufacturer_model_idx` (`manufacturer`, `model`),
  INDEX `DeviceCatalogRevision_createdById_idx` (`createdById`),
  CONSTRAINT `DeviceCatalogRevision_catalogItemId_fkey`
    FOREIGN KEY (`catalogItemId`) REFERENCES `DeviceCatalogItem`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DeviceCatalogRevision_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DeviceCatalogItem`
  ADD CONSTRAINT `DeviceCatalogItem_currentRevisionId_fkey`
    FOREIGN KEY (`currentRevisionId`) REFERENCES `DeviceCatalogRevision`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `DeviceCatalogItem_currentRevisionId_idx`
  ON `DeviceCatalogItem`(`currentRevisionId`);
