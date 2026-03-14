-- AlterTable
ALTER TABLE `Device`
    ADD COLUMN `projectInstallationId` VARCHAR(191) NULL,
    ADD COLUMN `networkSegmentId` VARCHAR(191) NULL,
    ADD COLUMN `vendorExternalId` VARCHAR(191) NULL,
    ADD COLUMN `hostname` VARCHAR(191) NULL,
    ADD COLUMN `firmwareVersion` VARCHAR(191) NULL,
    ADD COLUMN `deviceGroupId` VARCHAR(191) NULL,
    ADD COLUMN `rackId` VARCHAR(191) NULL,
    ADD COLUMN `installedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ProjectInstallation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `primarySiteId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `projectCode` VARCHAR(191) NULL,
    `status` ENUM('PLANNING', 'IN_PROGRESS', 'ACTIVE', 'ON_HOLD', 'COMPLETE', 'ARCHIVED') NOT NULL DEFAULT 'PLANNING',
    `projectType` ENUM('INSTALLATION', 'UPGRADE', 'ROLLOUT', 'REFRESH', 'MANAGED_HANDOFF', 'SUPPORT', 'OTHER') NOT NULL DEFAULT 'INSTALLATION',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `installationDate` DATETIME(3) NULL,
    `goLiveDate` DATETIME(3) NULL,
    `warrantyStartAt` DATETIME(3) NULL,
    `warrantyEndAt` DATETIME(3) NULL,
    `clientContactName` VARCHAR(191) NULL,
    `clientContactEmail` VARCHAR(191) NULL,
    `clientContactPhone` VARCHAR(64) NULL,
    `internalProjectManager` VARCHAR(191) NULL,
    `leadTechnician` VARCHAR(191) NULL,
    `salesOwner` VARCHAR(191) NULL,
    `scopeSummary` TEXT NULL,
    `remoteAccessMethod` VARCHAR(191) NULL,
    `handoffStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE') NOT NULL DEFAULT 'NOT_STARTED',
    `monitoringReady` BOOLEAN NOT NULL DEFAULT false,
    `vendorSystemsPlanned` TEXT NULL,
    `externalReference` VARCHAR(191) NULL,
    `internalNotes` TEXT NULL,
    `clientFacingNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectInstallation_organizationId_projectCode_key`(`organizationId`, `projectCode`),
    INDEX `ProjectInstallation_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ProjectInstallation_organizationId_projectType_idx`(`organizationId`, `projectType`),
    INDEX `ProjectInstallation_primarySiteId_idx`(`primarySiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectSite` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `projectInstallationId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `roleOrPhase` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProjectSite_projectInstallationId_siteId_key`(`projectInstallationId`, `siteId`),
    INDEX `ProjectSite_organizationId_idx`(`organizationId`),
    INDEX `ProjectSite_siteId_idx`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccessReference` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NULL,
    `projectInstallationId` VARCHAR(191) NULL,
    `deviceId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `accessType` ENUM('VPN', 'DDNS', 'CLOUD_PORTAL', 'SSH', 'WEB_UI', 'RDP', 'VENDOR_PORTAL', 'ONSITE', 'DOCUMENTATION', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `vaultProvider` VARCHAR(191) NULL,
    `vaultPath` VARCHAR(255) NULL,
    `owner` VARCHAR(191) NULL,
    `remoteAccessMethod` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `lastValidatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AccessReference_organizationId_idx`(`organizationId`),
    INDEX `AccessReference_siteId_idx`(`siteId`),
    INDEX `AccessReference_projectInstallationId_idx`(`projectInstallationId`),
    INDEX `AccessReference_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NetworkSegment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vlanId` INTEGER NULL,
    `subnetCidr` VARCHAR(64) NOT NULL,
    `gatewayIp` VARCHAR(64) NULL,
    `purpose` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NetworkSegment_siteId_name_key`(`siteId`, `name`),
    UNIQUE INDEX `NetworkSegment_siteId_vlanId_key`(`siteId`, `vlanId`),
    INDEX `NetworkSegment_organizationId_idx`(`organizationId`),
    INDEX `NetworkSegment_siteId_idx`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NvrChannelAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `nvrDeviceId` VARCHAR(191) NOT NULL,
    `cameraDeviceId` VARCHAR(191) NOT NULL,
    `channelNumber` INTEGER NOT NULL,
    `recordingEnabled` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NvrChannelAssignment_nvrDeviceId_channelNumber_key`(`nvrDeviceId`, `channelNumber`),
    UNIQUE INDEX `NvrChannelAssignment_cameraDeviceId_key`(`cameraDeviceId`),
    INDEX `NvrChannelAssignment_organizationId_idx`(`organizationId`),
    INDEX `NvrChannelAssignment_siteId_idx`(`siteId`),
    INDEX `NvrChannelAssignment_nvrDeviceId_idx`(`nvrDeviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceLink` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `sourceDeviceId` VARCHAR(191) NOT NULL,
    `targetDeviceId` VARCHAR(191) NOT NULL,
    `linkType` ENUM('UPLINK', 'DOWNSTREAM', 'POE_SUPPLY', 'MANAGEMENT', 'RECORDING', 'WIRELESS_UPLINK', 'OTHER') NOT NULL,
    `sourcePort` VARCHAR(191) NULL,
    `targetPort` VARCHAR(191) NULL,
    `poeProvided` BOOLEAN NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeviceLink_organizationId_idx`(`organizationId`),
    INDEX `DeviceLink_siteId_idx`(`siteId`),
    INDEX `DeviceLink_sourceDeviceId_idx`(`sourceDeviceId`),
    INDEX `DeviceLink_targetDeviceId_idx`(`targetDeviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Device_projectInstallationId_idx` ON `Device`(`projectInstallationId`);

-- CreateIndex
CREATE INDEX `Device_networkSegmentId_idx` ON `Device`(`networkSegmentId`);

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_networkSegmentId_fkey` FOREIGN KEY (`networkSegmentId`) REFERENCES `NetworkSegment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectInstallation` ADD CONSTRAINT `ProjectInstallation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectInstallation` ADD CONSTRAINT `ProjectInstallation_primarySiteId_fkey` FOREIGN KEY (`primarySiteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSite` ADD CONSTRAINT `ProjectSite_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSite` ADD CONSTRAINT `ProjectSite_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectSite` ADD CONSTRAINT `ProjectSite_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessReference` ADD CONSTRAINT `AccessReference_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessReference` ADD CONSTRAINT `AccessReference_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessReference` ADD CONSTRAINT `AccessReference_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessReference` ADD CONSTRAINT `AccessReference_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NetworkSegment` ADD CONSTRAINT `NetworkSegment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NetworkSegment` ADD CONSTRAINT `NetworkSegment_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NvrChannelAssignment` ADD CONSTRAINT `NvrChannelAssignment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NvrChannelAssignment` ADD CONSTRAINT `NvrChannelAssignment_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NvrChannelAssignment` ADD CONSTRAINT `NvrChannelAssignment_nvrDeviceId_fkey` FOREIGN KEY (`nvrDeviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NvrChannelAssignment` ADD CONSTRAINT `NvrChannelAssignment_cameraDeviceId_fkey` FOREIGN KEY (`cameraDeviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceLink` ADD CONSTRAINT `DeviceLink_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceLink` ADD CONSTRAINT `DeviceLink_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceLink` ADD CONSTRAINT `DeviceLink_sourceDeviceId_fkey` FOREIGN KEY (`sourceDeviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceLink` ADD CONSTRAINT `DeviceLink_targetDeviceId_fkey` FOREIGN KEY (`targetDeviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
