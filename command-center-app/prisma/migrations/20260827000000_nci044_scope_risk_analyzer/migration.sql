-- NCI-044 Scope Gap, Assumption & Risk Analyzer
-- Findings are advisory until explicitly accepted or dismissed by a human.

CREATE TABLE `ScopeRiskAnalysisRun` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `bidWorkspaceId` VARCHAR(191) NULL,
  `takeoffWorkspaceId` VARCHAR(191) NULL,
  `estimateId` VARCHAR(191) NULL,
  `projectInstallationId` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'COMPLETE',
  `inputSnapshot` LONGTEXT NOT NULL,
  `inputHash` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ScopeRiskAnalysisRun_org_idx` (`organizationId`),
  INDEX `ScopeRiskAnalysisRun_bid_idx` (`organizationId`, `bidWorkspaceId`),
  INDEX `ScopeRiskAnalysisRun_takeoff_idx` (`organizationId`, `takeoffWorkspaceId`),
  INDEX `ScopeRiskAnalysisRun_estimate_idx` (`organizationId`, `estimateId`),
  INDEX `ScopeRiskAnalysisRun_project_idx` (`organizationId`, `projectInstallationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScopeRiskFinding` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `analysisRunId` VARCHAR(191) NOT NULL,
  `stableKey` VARCHAR(255) NOT NULL,
  `findingType` VARCHAR(64) NOT NULL,
  `severity` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `detail` TEXT NOT NULL,
  `sourceRefs` LONGTEXT NOT NULL,
  `proposalSection` VARCHAR(32) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ScopeRiskFinding_run_key` (`analysisRunId`, `stableKey`),
  INDEX `ScopeRiskFinding_org_status_idx` (`organizationId`, `status`),
  INDEX `ScopeRiskFinding_run_idx` (`analysisRunId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScopeRiskFindingDecision` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `findingId` VARCHAR(191) NOT NULL,
  `decision` VARCHAR(32) NOT NULL,
  `decidedByUserId` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ScopeRiskFindingDecision_org_idx` (`organizationId`),
  INDEX `ScopeRiskFindingDecision_finding_idx` (`findingId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
