-- NCI-064 organization company profile and document branding.
ALTER TABLE `Organization`
  ADD COLUMN `legalName` VARCHAR(191) NULL,
  ADD COLUMN `websiteUrl` VARCHAR(255) NULL,
  ADD COLUMN `addressLine1` VARCHAR(191) NULL,
  ADD COLUMN `addressLine2` VARCHAR(191) NULL,
  ADD COLUMN `city` VARCHAR(191) NULL,
  ADD COLUMN `state` VARCHAR(191) NULL,
  ADD COLUMN `postalCode` VARCHAR(32) NULL,
  ADD COLUMN `country` VARCHAR(191) NULL,
  ADD COLUMN `timezone` VARCHAR(64) NULL,
  ADD COLUMN `logoUrl` VARCHAR(512) NULL,
  ADD COLUMN `brandPrimaryColor` VARCHAR(16) NULL,
  ADD COLUMN `brandAccentColor` VARCHAR(16) NULL,
  ADD COLUMN `brandTagline` VARCHAR(191) NULL;