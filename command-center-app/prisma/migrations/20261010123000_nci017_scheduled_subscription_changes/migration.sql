-- NCI-017: Persist provider-owned scheduled plan changes so Billing can
-- represent pending downgrades without treating them as current entitlement.
ALTER TABLE `OrganizationSubscription`
  ADD COLUMN `pendingPlan` ENUM('PRO', 'BUSINESS') NULL,
  ADD COLUMN `providerScheduleId` VARCHAR(191) NULL,
  ADD COLUMN `pendingPlanEffectiveAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `OrgSubscription_provider_schedule_key`
  ON `OrganizationSubscription`(`provider`, `providerScheduleId`);

CREATE INDEX `OrgSubscription_pending_plan_effective_idx`
  ON `OrganizationSubscription`(`pendingPlan`, `pendingPlanEffectiveAt`);
