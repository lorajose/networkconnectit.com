CREATE TABLE DesignProject (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  bidWorkspaceId VARCHAR(191) NULL,
  takeoffWorkspaceId VARCHAR(191) NULL,
  estimateId VARCHAR(191) NULL,
  projectInstallationId VARCHAR(191) NULL,
  currentVersionId VARCHAR(191) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  workingRevision INT NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DesignProject_organizationId_updatedAt_idx (organizationId, updatedAt),
  INDEX DesignProject_bidWorkspaceId_idx (bidWorkspaceId),
  INDEX DesignProject_takeoffWorkspaceId_idx (takeoffWorkspaceId),
  INDEX DesignProject_estimateId_idx (estimateId),
  INDEX DesignProject_projectInstallationId_idx (projectInstallationId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignAsset (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  mimeType VARCHAR(127) NOT NULL,
  storageKey VARCHAR(1024) NOT NULL,
  byteSize BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX DesignAsset_organizationId_storageKey_key (organizationId, storageKey),
  INDEX DesignAsset_project_idx (organizationId, designProjectId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignFloor (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  levelOrder INT NOT NULL DEFAULT 0,
  backgroundAssetId VARCHAR(191) NULL,
  canvasWidth DECIMAL(18,6) NOT NULL DEFAULT 1000,
  canvasHeight DECIMAL(18,6) NOT NULL DEFAULT 1000,
  scaleUnit VARCHAR(16) NOT NULL DEFAULT 'FT',
  realUnitsPerDesignUnit DECIMAL(18,9) NULL,
  calibrationJson LONGTEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DesignFloor_project_order_idx (organizationId, designProjectId, levelOrder)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignLayer (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  designFloorId VARCHAR(191) NOT NULL,
  discipline VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isVisible BOOLEAN NOT NULL DEFAULT TRUE,
  isLocked BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DesignLayer_floor_idx (organizationId, designFloorId, sortOrder),
  INDEX DesignLayer_project_discipline_idx (organizationId, designProjectId, discipline)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignElement (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  designFloorId VARCHAR(191) NOT NULL,
  designLayerId VARCHAR(191) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  geometryJson LONGTEXT NOT NULL,
  styleJson LONGTEXT NULL,
  metadataJson LONGTEXT NULL,
  schemaVersion INT NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DesignElement_floor_layer_idx (organizationId, designFloorId, designLayerId),
  INDEX DesignElement_project_kind_idx (organizationId, designProjectId, kind)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignDevice (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  designFloorId VARCHAR(191) NOT NULL,
  designElementId VARCHAR(191) NOT NULL,
  catalogItemId VARCHAR(191) NULL,
  discipline VARCHAR(32) NOT NULL,
  deviceType VARCHAR(64) NOT NULL,
  manufacturer VARCHAR(128) NULL,
  model VARCHAR(255) NULL,
  specSnapshotJson LONGTEXT NULL,
  mountingHeight DECIMAL(18,6) NULL,
  headingDegrees DECIMAL(9,4) NULL,
  ipAddress VARCHAR(64) NULL,
  notes TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX DesignDevice_element_key (organizationId, designElementId),
  INDEX DesignDevice_project_type_idx (organizationId, designProjectId, deviceType)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignCablePath (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  designFloorId VARCHAR(191) NOT NULL,
  designElementId VARCHAR(191) NOT NULL,
  cableType VARCHAR(64) NOT NULL,
  startDeviceId VARCHAR(191) NULL,
  endDeviceId VARCHAR(191) NULL,
  measuredDesignLength DECIMAL(18,6) NOT NULL DEFAULT 0,
  slackPercent DECIMAL(9,4) NOT NULL DEFAULT 0,
  calculatedLength DECIMAL(18,6) NULL,
  unit VARCHAR(16) NOT NULL DEFAULT 'FT',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX DesignCablePath_element_key (organizationId, designElementId),
  INDEX DesignCablePath_project_type_idx (organizationId, designProjectId, cableType)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignConnection (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  fromDeviceId VARCHAR(191) NOT NULL,
  toDeviceId VARCHAR(191) NOT NULL,
  connectionType VARCHAR(64) NOT NULL,
  cablePathId VARCHAR(191) NULL,
  metadataJson LONGTEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DesignConnection_project_idx (organizationId, designProjectId),
  INDEX DesignConnection_from_idx (organizationId, fromDeviceId),
  INDEX DesignConnection_to_idx (organizationId, toDeviceId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DesignVersion (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  designProjectId VARCHAR(191) NOT NULL,
  versionNumber INT NOT NULL,
  snapshotJson LONGTEXT NOT NULL,
  snapshotHash CHAR(64) NOT NULL,
  reason VARCHAR(255) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX DesignVersion_project_version_key (organizationId, designProjectId, versionNumber),
  UNIQUE INDEX DesignVersion_project_hash_key (organizationId, designProjectId, snapshotHash),
  INDEX DesignVersion_project_created_idx (organizationId, designProjectId, createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DeviceCatalogItem (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'GLOBAL',
  discipline VARCHAR(32) NOT NULL,
  deviceType VARCHAR(64) NOT NULL,
  manufacturer VARCHAR(128) NULL,
  model VARCHAR(255) NULL,
  displayName VARCHAR(255) NOT NULL,
  sourceType VARCHAR(32) NOT NULL DEFAULT 'CURATED',
  sourceName VARCHAR(255) NULL,
  sourceReference VARCHAR(1024) NULL,
  licensingStatus VARCHAR(32) NOT NULL DEFAULT 'INTERNAL',
  activeRevisionId VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX DeviceCatalogItem_scope_type_idx (scope, organizationId, discipline, deviceType),
  INDEX DeviceCatalogItem_manufacturer_model_idx (manufacturer, model)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE DeviceCatalogRevision (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NULL,
  catalogItemId VARCHAR(191) NOT NULL,
  revisionNumber INT NOT NULL,
  specificationJson LONGTEXT NOT NULL,
  sourceHash CHAR(64) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX DeviceCatalogRevision_item_revision_key (catalogItemId, revisionNumber),
  INDEX DeviceCatalogRevision_item_created_idx (catalogItemId, createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
