-- NCI-014 Cable Run Execution
-- Extends the existing ProjectWorkOrderItem execution record; Device inventory remains unchanged.

ALTER TABLE ProjectWorkOrderItem
  ADD COLUMN runIdentifier VARCHAR(191) NULL,
  ADD COLUMN scopeType VARCHAR(32) NOT NULL DEFAULT 'NEW',
  ADD COLUMN fromLocation VARCHAR(191) NULL,
  ADD COLUMN toLocation VARCHAR(191) NULL,
  ADD COLUMN cableType VARCHAR(64) NULL,
  ADD COLUMN measuredLength DECIMAL(10,2) NULL,
  ADD COLUMN lengthUnit VARCHAR(16) NULL,
  ADD COLUMN floorLevel VARCHAR(191) NULL,
  ADD COLUMN terminationPoint VARCHAR(191) NULL,
  ADD COLUMN deviceLocation VARCHAR(191) NULL,
  ADD COLUMN deviceType VARCHAR(191) NULL,
  ADD COLUMN labeled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN wiremapStatus VARCHAR(16) NULL,
  ADD COLUMN gigabitLinkStatus VARCHAR(16) NULL,
  ADD COLUMN evidenceSaved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN acceptanceStatus VARCHAR(32) NULL;

CREATE UNIQUE INDEX ProjectWorkOrderItem_org_runIdentifier_key
  ON ProjectWorkOrderItem(organizationId, runIdentifier);

CREATE TABLE ProjectWorkOrderFloorCloseout (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  floorLevel VARCHAR(191) NOT NULL,
  cableSupportPassed BOOLEAN NOT NULL DEFAULT FALSE,
  racewayConduitPassed BOOLEAN NOT NULL DEFAULT FALSE,
  firestopPassed BOOLEAN NOT NULL DEFAULT FALSE,
  labelReconciliationPassed BOOLEAN NOT NULL DEFAULT FALSE,
  cleanupPassed BOOLEAN NOT NULL DEFAULT FALSE,
  workAreaPhotosSaved BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  completedByUserId VARCHAR(191) NULL,
  completedAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY ProjectWorkOrderFloorCloseout_floor_key (organizationId, workOrderId, floorLevel),
  KEY ProjectWorkOrderFloorCloseout_workOrder_idx (organizationId, workOrderId)
);
