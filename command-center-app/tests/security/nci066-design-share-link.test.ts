import assert from "node:assert/strict";
import test from "node:test";

import {
  createDesignShare,
  resolveDesignShare,
  revokeDesignShare,
  type DesignShareRecord,
  type DesignShareRepository,
} from "../../lib/contractor-os/design-share-link";
import type { IssuedDesignReport } from "../../lib/contractor-os/design-report-issuance";

function repositoryFixture(): DesignShareRepository & { records: DesignShareRecord[]; audits: Array<{ event: string; detail?: string }> } {
  const records: DesignShareRecord[] = [];
  const audits: Array<{ event: string; detail?: string }> = [];
  return {
    records,
    audits,
    async create(record) { records.push(record); },
    async findByTokenHash(hash) { return records.find((record) => record.tokenHash === hash) ?? null; },
    async revoke(shareId, organizationId, revokedAt) {
      const record = records.find((item) => item.id === shareId && item.organizationId === organizationId);
      if (!record) return false;
      record.revokedAt = revokedAt;
      return true;
    },
    async audit(input) { audits.push({ event: input.event, detail: input.detail }); },
  };
}

function reportFixture(): IssuedDesignReport {
  return {
    id: "design-report:project:v1:fixture",
    version: 1,
    issuedAt: "2026-10-11T13:00:00.000Z",
    issuedByUserId: "internal-user",
    projectId: "tenant-project-id",
    organizationId: "tenant-organization-id",
    profile: {
      sections: ["COVER", "FLOOR_PLANS", "BOM", "CABLE_SCHEDULE"],
      visibleLayerIds: ["client-layer"],
      includePricing: false,
      clientSafe: true,
    },
    model: {
      sections: ["COVER", "FLOOR_PLANS", "BOM", "CABLE_SCHEDULE"],
      floors: [{ id: "internal-floor-id", name: "First Floor", elementCount: 4, deviceCount: 2, cablePathCount: 2 }],
      bom: [{ key: "camera", description: "Camera", quantity: 2, unit: "EA", sourceElementIds: ["internal-element"] }],
      cableSchedule: [{ key: "cat6", description: "CAT6", quantityFeet: 200, sourceElementIds: ["internal-cable"] }],
      pricingVisible: false,
      warnings: [],
    },
    commercialLink: {},
    digest: "report-digest",
  };
}

test("NCI-066 creates random tokenized share without returning tenant ids", async () => {
  const repository = repositoryFixture();
  const created = await createDesignShare({
    repository,
    report: reportFixture(),
    expiresAt: new Date("2026-10-12T13:00:00.000Z"),
    now: new Date("2026-10-11T13:00:00.000Z"),
  });

  assert.ok(created.token.length > 30);
  assert.equal(repository.records.length, 1);
  assert.notEqual(repository.records[0].tokenHash, created.token);

  const view = await resolveDesignShare({
    repository,
    token: created.token,
    report: reportFixture(),
    now: new Date("2026-10-11T13:05:00.000Z"),
  });

  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes("tenant-project-id"), false);
  assert.equal(serialized.includes("tenant-organization-id"), false);
  assert.equal(serialized.includes("internal-floor-id"), false);
  assert.equal(serialized.includes("internal-element"), false);
  assert.equal(serialized.includes("First Floor"), true);
  assert.equal(repository.audits.at(-1)?.event, "VIEW");
});

test("NCI-066 optional password and expiration are enforced", async () => {
  const repository = repositoryFixture();
  const created = await createDesignShare({
    repository,
    report: reportFixture(),
    password: "client-access-phrase",
    expiresAt: new Date("2026-10-11T14:00:00.000Z"),
    now: new Date("2026-10-11T13:00:00.000Z"),
  });

  await assert.rejects(() => resolveDesignShare({
    repository,
    token: created.token,
    report: reportFixture(),
    password: "wrong-value",
    now: new Date("2026-10-11T13:10:00.000Z"),
  }));

  const view = await resolveDesignShare({
    repository,
    token: created.token,
    report: reportFixture(),
    password: "client-access-phrase",
    now: new Date("2026-10-11T13:10:00.000Z"),
  });
  assert.equal(view.reportVersion, 1);

  await assert.rejects(() => resolveDesignShare({
    repository,
    token: created.token,
    report: reportFixture(),
    password: "client-access-phrase",
    now: new Date("2026-10-11T14:00:00.000Z"),
  }));
});

test("NCI-066 revocation is immediate and auditable", async () => {
  const repository = repositoryFixture();
  const created = await createDesignShare({ repository, report: reportFixture() });

  assert.equal(await revokeDesignShare({
    repository,
    shareId: created.shareId,
    organizationId: "tenant-organization-id",
  }), true);

  await assert.rejects(() => resolveDesignShare({
    repository,
    token: created.token,
    report: reportFixture(),
  }));

  assert.equal(repository.audits.at(-1)?.event, "DENIED");
  assert.equal(repository.audits.at(-1)?.detail, "revoked");
});

test("NCI-066 share profile always removes pricing", async () => {
  const repository = repositoryFixture();
  const created = await createDesignShare({
    repository,
    report: reportFixture(),
    profile: {
      sections: ["COVER", "FLOOR_PLANS", "PRICING_SUMMARY"],
      includePricing: true,
      visibleLayerIds: ["client-layer"],
    },
  });

  assert.equal(created.profile.clientSafe, true);
  assert.equal(created.profile.includePricing, false);
  assert.equal(created.profile.sections.some((section) => section === "PRICING_SUMMARY"), false);
});
