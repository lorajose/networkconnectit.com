CREATE TABLE SurveyTemplate (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  disciplinesJson LONGTEXT NOT NULL,
  checklistJson LONGTEXT NOT NULL,
  versionNumber INT NOT NULL DEFAULT 1,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyTemplate_org_active_idx (organizationId, isActive, updatedAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyAssignment (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NOT NULL,
  siteId VARCHAR(191) NOT NULL,
  templateId VARCHAR(191) NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
  disciplinesJson LONGTEXT NOT NULL,
  assignedToUserId VARCHAR(191) NULL,
  assignedByUserId VARCHAR(191) NOT NULL,
  scheduledAt DATETIME(3) NULL,
  dueAt DATETIME(3) NULL,
  instructions TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyAssignment_org_status_idx (organizationId, status, updatedAt),
  INDEX SurveyAssignment_project_idx (organizationId, projectInstallationId),
  INDEX SurveyAssignment_site_idx (organizationId, siteId),
  INDEX SurveyAssignment_technician_idx (organizationId, assignedToUserId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveySession (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  assignmentId VARCHAR(191) NOT NULL,
  technicianUserId VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
  checklistSnapshotJson LONGTEXT NOT NULL,
  startedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completedAt DATETIME(3) NULL,
  arrivalLatitude DECIMAL(10,7) NULL,
  arrivalLongitude DECIMAL(10,7) NULL,
  arrivalAccuracyMeters DECIMAL(12,3) NULL,
  customerContactName VARCHAR(191) NULL,
  customerSignoffName VARCHAR(191) NULL,
  customerSignoffAt DATETIME(3) NULL,
  notes TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveySession_assignment_idx (organizationId, assignmentId, createdAt),
  INDEX SurveySession_technician_idx (organizationId, technicianUserId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyArea (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  parentAreaId VARCHAR(191) NULL,
  areaType VARCHAR(32) NOT NULL DEFAULT 'AREA',
  name VARCHAR(255) NOT NULL,
  levelOrder INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyArea_session_order_idx (organizationId, sessionId, levelOrder),
  INDEX SurveyArea_parent_idx (organizationId, parentAreaId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyAsset (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  areaId VARCHAR(191) NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'PHOTO',
  originalName VARCHAR(255) NOT NULL,
  mimeType VARCHAR(127) NOT NULL,
  storageKey VARCHAR(1024) NOT NULL,
  byteSize BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  capturedAt DATETIME(3) NULL,
  capturedByUserId VARCHAR(191) NOT NULL,
  metadataJson LONGTEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX SurveyAsset_org_storage_key (organizationId, storageKey(191)),
  INDEX SurveyAsset_session_idx (organizationId, sessionId, createdAt),
  INDEX SurveyAsset_area_idx (organizationId, areaId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyPoint (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  areaId VARCHAR(191) NULL,
  assetId VARCHAR(191) NULL,
  discipline VARCHAR(32) NOT NULL,
  pointType VARCHAR(64) NOT NULL,
  lifecycle VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
  label VARCHAR(255) NULL,
  normalizedX DECIMAL(9,6) NULL,
  normalizedY DECIMAL(9,6) NULL,
  mountingHeight DECIMAL(18,6) NULL,
  measurementUnit VARCHAR(16) NOT NULL DEFAULT 'FT',
  manufacturer VARCHAR(128) NULL,
  model VARCHAR(255) NULL,
  notes TEXT NULL,
  metadataJson LONGTEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX SurveyPoint_session_discipline_idx (organizationId, sessionId, discipline),
  INDEX SurveyPoint_area_idx (organizationId, areaId),
  INDEX SurveyPoint_asset_idx (organizationId, assetId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyChecklistResponse (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  itemKey VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  valueJson LONGTEXT NULL,
  notes TEXT NULL,
  completedByUserId VARCHAR(191) NULL,
  completedAt DATETIME(3) NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX SurveyChecklistResponse_session_item_key (organizationId, sessionId, itemKey),
  INDEX SurveyChecklistResponse_session_status_idx (organizationId, sessionId, status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE SurveyDesignHandoff (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  sessionId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX SurveyDesignHandoff_session_design_key (organizationId, sessionId, designProjectId),
  INDEX SurveyDesignHandoff_design_idx (organizationId, designProjectId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
