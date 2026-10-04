-- NCI-016 server-verified Project Pass persistence.
-- Payment provider events are idempotent by provider + providerEventId.
-- Tenant isolation invariant: every row carries organizationId and projectInstallationId.

CREATE TABLE `ProjectPassPayment` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NOT NULL,
  `product` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `providerPaymentId` VARCHAR(191) NOT NULL,
  `state` ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `amountCents` INT NOT NULL,
  `currency` VARCHAR(3) NOT NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProjectPassPayment_provider_payment_key` (`provider`, `providerPaymentId`),
  INDEX `ProjectPassPayment_org_project_idx` (`organizationId`, `projectInstallationId`, `state`),
  CONSTRAINT `ProjectPassPayment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectPassPayment_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProjectPassPaymentEvent` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NOT NULL,
  `paymentId` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `providerEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(96) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProjectPassPaymentEvent_provider_event_key` (`provider`, `providerEventId`),
  INDEX `ProjectPassPaymentEvent_org_project_idx` (`organizationId`, `projectInstallationId`, `receivedAt`),
  CONSTRAINT `ProjectPassPaymentEvent_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectPassPaymentEvent_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectPassPaymentEvent_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `ProjectPassPayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProjectPassEntitlement` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `projectInstallationId` VARCHAR(191) NOT NULL,
  `product` VARCHAR(64) NOT NULL,
  `paymentId` VARCHAR(191) NOT NULL,
  `grantedAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProjectPassEntitlement_project_product_key` (`organizationId`, `projectInstallationId`, `product`),
  INDEX `ProjectPassEntitlement_org_project_idx` (`organizationId`, `projectInstallationId`, `revokedAt`),
  CONSTRAINT `ProjectPassEntitlement_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectPassEntitlement_projectInstallationId_fkey` FOREIGN KEY (`projectInstallationId`) REFERENCES `ProjectInstallation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectPassEntitlement_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `ProjectPassPayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
