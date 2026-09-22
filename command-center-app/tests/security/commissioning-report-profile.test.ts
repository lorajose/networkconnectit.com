import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCommissioningReportProfile,
  getCommissioningReportProfile
} from "../../lib/management/commissioning-report-profile";

const base = {
  project: {
    internalProjectManager: "Internal PM",
    leadTechnician: "Tech",
    salesOwner: "Sales",
    remoteAccessMethod: "VPN"
  },
  networkSegments: [{
    subnetCidr: "10.10.0.0/24",
    gatewayIp: "10.10.0.1",
    notes: "internal"
  }],
  accessReferences: [{
    vaultPath: "vault/customer/firewall",
    remoteAccessMethod: "VPN",
    notes: "internal"
  }],
  deviceLinks: [{
    sourcePort: "Gi1/0/1",
    targetPort: "eth0",
    notes: "internal"
  }]
} as any;

test("external tenant roles are forced to customer-copy profile", () => {
  assert.equal(getCommissioningReportProfile("VIEWER"), "CUSTOMER_COPY");
  assert.equal(getCommissioningReportProfile("CLIENT_ADMIN"), "CUSTOMER_COPY");
  assert.equal(getCommissioningReportProfile("SUPER_ADMIN"), "INTERNAL_OPERATIONS");
  assert.equal(getCommissioningReportProfile("INTERNAL_ADMIN"), "INTERNAL_OPERATIONS");
});

test("customer copy redacts operational infrastructure metadata", () => {
  const report = applyCommissioningReportProfile(base, "CUSTOMER_COPY");
  assert.equal(report.project?.remoteAccessMethod, null);
  assert.equal(report.project?.internalProjectManager, null);
  assert.equal(report.project?.leadTechnician, null);
  assert.equal(report.project?.salesOwner, null);
  assert.equal(report.networkSegments[0]?.subnetCidr, "Redacted");
  assert.equal(report.networkSegments[0]?.gatewayIp, null);
  assert.equal(report.networkSegments[0]?.notes, null);
  assert.deepEqual(report.accessReferences, []);
  assert.equal(report.deviceLinks[0]?.sourcePort, null);
  assert.equal(report.deviceLinks[0]?.targetPort, null);
  assert.equal(report.deviceLinks[0]?.notes, null);
});

test("contractor closeout removes vault and remote access references", () => {
  const report = applyCommissioningReportProfile(base, "CONTRACTOR_CLOSEOUT");
  assert.equal(report.project?.remoteAccessMethod, null);
  assert.equal(report.accessReferences[0]?.vaultPath, null);
  assert.equal(report.accessReferences[0]?.remoteAccessMethod, null);
  assert.equal(report.accessReferences[0]?.notes, null);
});
