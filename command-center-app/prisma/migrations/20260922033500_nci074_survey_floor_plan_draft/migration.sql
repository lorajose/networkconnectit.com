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
