import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

const policies = [
  {
    file: "app/(protected)/organizations/actions.ts",
    required: ["\"use server\"", "requireUser(", "requireOrganizationManagementAccess"]
  },
  {
    file: "app/(protected)/sites/actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess", "getScopedRecordWhere"]
  },
  {
    file: "app/(protected)/devices/actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess", "getScopedRecordWhere", "resolveWritableOrganizationId"]
  },
  {
    file: "app/(protected)/devices/import/actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess"]
  },
  {
    file: "app/(protected)/projects/actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess", "getScopedRecordWhere"]
  },
  {
    file: "app/(protected)/projects/wizard-actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess"]
  },
  {
    file: "app/(protected)/infrastructure-actions.ts",
    required: ["\"use server\"", "requireUser(", "requireInventoryWriteAccess"]
  },
  {
    file: "app/(protected)/monitoring-actions.ts",
    required: ["\"use server\"", "requireUser(", "canRunHealthSimulation"]
  }
];

let failures = 0;

for (const policy of policies) {
  const source = await readFile(resolve(root, policy.file), "utf8");
  try {
    for (const token of policy.required) {
      assert.ok(
        source.includes(token),
        `${policy.file} must contain security guard token: ${token}`
      );
    }
    console.log(`PASS ${policy.file}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${error.message}`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Security action policy checks passed for ${policies.length} server-action modules.`);
