CREATE TABLE SurveyFloorPlanDraft (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  areaId VARCHAR(191) NULL,
  name VARCHAR(255) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'FIELD_CAPTURE',
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  geometryJson LONGTEXT NOT NULL,
  calibrationJson LONGTEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyFloorPlanDraft_session_idx (organizationId, sessionId, updatedAt),
  INDEX SurveyFloorPlanDraft_area_idx (organizationId, areaId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyFloorPlanItem (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  floorPlanDraftId VARCHAR(191) NOT NULL,
  surveyPointId VARCHAR(191) NULL,
  discipline VARCHAR(32) NOT NULL,
  pointType VARCHAR(64) NOT NULL,
  label VARCHAR(255) NULL,
  normalizedX DECIMAL(9,6) NOT NULL,
  normalizedY DECIMAL(9,6) NOT NULL,
  rotationDegrees DECIMAL(9,3) NULL,
  metadataJson LONGTEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyFloorPlanItem_draft_idx (organizationId, floorPlanDraftId),
  UNIQUE INDEX SurveyFloorPlanItem_draft_point_key (organizationId, floorPlanDraftId, surveyPointId),
  INDEX SurveyFloorPlanItem_point_idx (organizationId, surveyPointId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE SurveyMeasurement (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  areaId VARCHAR(191) NULL,
  floorPlanDraftId VARCHAR(191) NULL,
  measurementType VARCHAR(32) NOT NULL DEFAULT 'DISTANCE',
  label VARCHAR(255) NOT NULL,
  value DECIMAL(12,3) NOT NULL,
  unit VARCHAR(16) NOT NULL DEFAULT 'FT',
  startX DECIMAL(9,6) NULL,
  startY DECIMAL(9,6) NULL,
  endX DECIMAL(9,6) NULL,
  endY DECIMAL(9,6) NULL,
  notes TEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyMeasurement_session_idx (organizationId, sessionId, createdAt),
  INDEX SurveyMeasurement_area_idx (organizationId, areaId),
  INDEX SurveyMeasurement_draft_idx (organizationId, floorPlanDraftId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE SurveyPhotoAreaLink (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  areaId VARCHAR(191) NOT NULL,
  assetId VARCHAR(191) NOT NULL,
  viewLabel VARCHAR(255) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX SurveyPhotoAreaLink_area_asset_key (organizationId, areaId, assetId),
  INDEX SurveyPhotoAreaLink_session_area_idx (organizationId, sessionId, areaId, sortOrder)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE SurveyFloorPlanApproval (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  floorPlanDraftId VARCHAR(191) NOT NULL,
  revisionNumber INT NOT NULL,
  snapshotJson LONGTEXT NOT NULL,
  snapshotHash CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING_CUSTOMER',
  customerName VARCHAR(255) NULL,
  customerEmail VARCHAR(255) NULL,
  customerNote TEXT NULL,
  approvedAt DATETIME(3) NULL,
  approvedByUserId VARCHAR(191) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX SurveyFloorPlanApproval_revision_key (organizationId, sessionId, revisionNumber),
  UNIQUE INDEX SurveyFloorPlanApproval_hash_key (organizationId, sessionId, snapshotHash),
  INDEX SurveyFloorPlanApproval_status_idx (organizationId, status, updatedAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE ProjectWorkOrder (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NOT NULL,
  siteId VARCHAR(191) NOT NULL,
  surveySessionId VARCHAR(191) NOT NULL,
  floorPlanApprovalId VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  assignedToUserId VARCHAR(191) NULL,
  customerNote TEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  startedAt DATETIME(3) NULL,
  completedAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX ProjectWorkOrder_approval_key (organizationId, floorPlanApprovalId),
  INDEX ProjectWorkOrder_project_status_idx (organizationId, projectInstallationId, status),
  INDEX ProjectWorkOrder_assignee_idx (organizationId, assignedToUserId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE ProjectWorkOrderItem (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  sourceSurveyPointId VARCHAR(191) NULL,
  discipline VARCHAR(32) NOT NULL,
  itemType VARCHAR(64) NOT NULL,
  label VARCHAR(255) NULL,
  areaName VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  pulledInstalled BOOLEAN NOT NULL DEFAULT FALSE,
  terminated BOOLEAN NOT NULL DEFAULT FALSE,
  testStatus VARCHAR(16) NULL,
  photoEvidenceRequired BOOLEAN NOT NULL DEFAULT FALSE,
  technicianNote TEXT NULL,
  completedByUserId VARCHAR(191) NULL,
  completedAt DATETIME(3) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ProjectWorkOrderItem_work_order_idx (organizationId, workOrderId, sortOrder),
  INDEX ProjectWorkOrderItem_status_idx (organizationId, workOrderId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE ProjectActivityEvent (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NOT NULL,
  surveySessionId VARCHAR(191) NULL,
  workOrderId VARCHAR(191) NULL,
  eventType VARCHAR(64) NOT NULL,
  actorUserId VARCHAR(191) NULL,
  actorName VARCHAR(255) NULL,
  actorType VARCHAR(32) NOT NULL DEFAULT 'USER',
  summary VARCHAR(512) NOT NULL,
  detailsJson LONGTEXT NULL,
  customerNote TEXT NULL,
  occurredAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ProjectActivityEvent_project_time_idx (organizationId, projectInstallationId, occurredAt),
  INDEX ProjectActivityEvent_survey_time_idx (organizationId, surveySessionId, occurredAt),
  INDEX ProjectActivityEvent_work_order_time_idx (organizationId, workOrderId, occurredAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE ProjectWorkOrderItemEvent (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  workOrderItemId VARCHAR(191) NOT NULL,
  stage VARCHAR(32) NOT NULL,
  result VARCHAR(32) NULL,
  actorUserId VARCHAR(191) NOT NULL,
  note TEXT NULL,
  occurredAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ProjectWorkOrderItemEvent_item_time_idx (organizationId, workOrderItemId, occurredAt),
  INDEX ProjectWorkOrderItemEvent_work_order_time_idx (organizationId, workOrderId, occurredAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE ProjectWorkOrderEvidence (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  workOrderItemId VARCHAR(191) NOT NULL,
  evidenceType VARCHAR(32) NOT NULL DEFAULT 'PHOTO',
  originalName VARCHAR(255) NOT NULL,
  mimeType VARCHAR(128) NOT NULL,
  byteSize BIGINT NOT NULL,
  storageKey VARCHAR(1024) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  caption VARCHAR(512) NULL,
  uploadedByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ProjectWorkOrderEvidence_item_time_idx (organizationId, workOrderItemId, createdAt),
  UNIQUE INDEX ProjectWorkOrderEvidence_storage_key (storageKey)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE FieldTechnicianProfile (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  userId VARCHAR(191) NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX FieldTechnicianProfile_user_key (organizationId, userId),
  INDEX FieldTechnicianProfile_status_idx (organizationId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE ProjectPunchListItem (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  workOrderItemId VARCHAR(191) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  assignedToUserId VARCHAR(191) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  resolvedByUserId VARCHAR(191) NULL,
  resolvedAt DATETIME(3) NULL,
  resolutionNote TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ProjectPunchListItem_work_order_idx (organizationId, workOrderId, status, createdAt),
  INDEX ProjectPunchListItem_assignee_idx (organizationId, assignedToUserId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE ProjectFinalAcceptance (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  customerName VARCHAR(255) NULL,
  customerEmail VARCHAR(255) NULL,
  customerNote TEXT NULL,
  acceptedAt DATETIME(3) NULL,
  decisionRecordedByUserId VARCHAR(191) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX ProjectFinalAcceptance_work_order_key (organizationId, workOrderId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE ProjectCloseoutPackage (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NOT NULL,
  surveySessionId VARCHAR(191) NOT NULL,
  workOrderId VARCHAR(191) NOT NULL,
  finalAcceptanceId VARCHAR(191) NOT NULL,
  packageVersion INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  manifestJson LONGTEXT NOT NULL,
  manifestHash CHAR(64) NOT NULL,
  generatedByUserId VARCHAR(191) NOT NULL,
  generatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX ProjectCloseoutPackage_work_order_version_key (organizationId, workOrderId, packageVersion),
  INDEX ProjectCloseoutPackage_project_idx (organizationId, projectInstallationId, generatedAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
