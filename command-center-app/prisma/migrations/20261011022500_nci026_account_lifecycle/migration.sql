ALTER TABLE `User`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `authVersion` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;

CREATE INDEX `User_isActive_idx` ON `User`(`isActive`);
