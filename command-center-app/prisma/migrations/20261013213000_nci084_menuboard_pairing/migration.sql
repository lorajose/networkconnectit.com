-- NCI-084 MenuBoard pairing codes
-- Source-controlled only. Do not apply to production without explicit release authorization.

CREATE TABLE `MenuPairingCode` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `screenId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MenuPairingCode_codeHash_key`(`codeHash`),
  INDEX `MenuPairingCode_organizationId_screenId_idx`(`organizationId`, `screenId`),
  INDEX `MenuPairingCode_screenId_expiresAt_idx`(`screenId`, `expiresAt`),
  INDEX `MenuPairingCode_expiresAt_consumedAt_idx`(`expiresAt`, `consumedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MenuPairingCode` ADD CONSTRAINT `MenuPairingCode_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MenuPairingCode` ADD CONSTRAINT `MenuPairingCode_screenId_fkey`
  FOREIGN KEY (`screenId`) REFERENCES `MenuBoardScreen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
