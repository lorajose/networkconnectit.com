-- NCI-086 MenuBoard deli template presentation metadata
-- Source-controlled only. Do not apply to production without explicit release authorization.

ALTER TABLE `Menu`
  ADD COLUMN `displayName` VARCHAR(191) NULL,
  ADD COLUMN `logoUrl` VARCHAR(512) NULL,
  ADD COLUMN `promotionTitle` VARCHAR(191) NULL,
  ADD COLUMN `promotionText` VARCHAR(512) NULL;
