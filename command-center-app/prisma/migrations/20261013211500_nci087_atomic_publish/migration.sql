-- NCI-087 Atomic publish binding for MenuBoard screens
-- Source-controlled only. Do not apply to production without explicit release authorization.

ALTER TABLE `MenuScreenAssignment`
  ADD COLUMN `activePublishId` VARCHAR(191) NULL;

CREATE INDEX `MenuScreenAssignment_activePublishId_idx`
  ON `MenuScreenAssignment`(`activePublishId`);

ALTER TABLE `MenuScreenAssignment`
  ADD CONSTRAINT `MenuScreenAssignment_activePublishId_fkey`
  FOREIGN KEY (`activePublishId`) REFERENCES `MenuPublish`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
