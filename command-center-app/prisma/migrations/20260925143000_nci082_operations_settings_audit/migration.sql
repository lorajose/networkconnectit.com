CREATE TABLE OperationsOrganizationSettings (
  organizationId VARCHAR(191) NOT NULL,
  defaultTimeZone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
  overtimeMultiplier DECIMAL(6,3) NOT NULL DEFAULT 1.500,
  payPeriod VARCHAR(32) NOT NULL DEFAULT 'BIWEEKLY',
  updatedByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (organizationId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsAuditEvent (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  actorUserId VARCHAR(191) NOT NULL,
  eventType VARCHAR(64) NOT NULL,
  entityType VARCHAR(64) NOT NULL,
  entityId VARCHAR(191) NULL,
  detailsJson LONGTEXT NULL,
  occurredAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsAuditEvent_org_time_idx (organizationId, occurredAt),
  INDEX OperationsAuditEvent_entity_idx (organizationId, entityType, entityId, occurredAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
