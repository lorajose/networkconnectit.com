ALTER TABLE FieldTechnicianProfile
  ADD COLUMN employmentStatus VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE OperationsTechnicianDocument (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  technicianProfileId VARCHAR(191) NOT NULL,
  documentType VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  expiresOn DATE NULL,
  storageKey VARCHAR(512) NOT NULL,
  uploadedByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsTechnicianDocument_tech_idx (organizationId, technicianProfileId, documentType),
  INDEX OperationsTechnicianDocument_expiry_idx (organizationId, expiresOn)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
