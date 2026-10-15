import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "lib/contractor-os/subscription-management-service.ts"), "utf8");

test("scheduled-change cancellation clears state with an optimistic identity match", () => {
  assert.match(source, /organizationSubscription\.updateMany\(\{/);
  assert.match(source, /providerSubscriptionId:\s*stored\.providerSubscriptionId/);
  assert.match(source, /providerScheduleId:\s*stored\.providerScheduleId/);
  assert.match(source, /pendingPlan:\s*stored\.pendingPlan/);
  assert.match(source, /if \(cleared\.count !== 1\)/);
  assert.match(source, /Subscription schedule state changed while the provider schedule was being released/);
});

test("scheduled-change cancellation does not use an unconditional single-row cleanup", () => {
  const cancellationStart = source.indexOf("export async function cancelOrganizationScheduledPlanChange");
  const changeStart = source.indexOf("export async function changeOrganizationSubscription");
  assert.ok(cancellationStart >= 0 && changeStart > cancellationStart);
  const cancellation = source.slice(cancellationStart, changeStart);
  assert.doesNotMatch(cancellation, /organizationSubscription\.update\(\{/);
});
