import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/db";
import { confirmAerialSiteLocation } from "../../lib/contractor-os/aerial-site-location-repository";

test("NCI-069 tenant-scoped location confirmation refuses cross-tenant sites", async () => {
  const originalFindFirst = prisma.site.findFirst;
  const originalUpdate = prisma.site.update;
  let capturedWhere: unknown;
  let updateCalled = false;

  prisma.site.findFirst = (async (args: unknown) => {
    capturedWhere = (args as { where?: unknown }).where;
    return null;
  }) as typeof prisma.site.findFirst;
  prisma.site.update = (async () => {
    updateCalled = true;
    throw new Error("must not update");
  }) as unknown as typeof prisma.site.update;

  try {
    const result = await confirmAerialSiteLocation({
      actor: { role: "CLIENT_ADMIN", organizationId: "tenant-a" },
      requestedOrganizationId: "tenant-b",
      siteId: "site-b",
      formattedAddress: "100 Main Street, New York, NY",
      latitude: 40.7,
      longitude: -74.0,
    });

    assert.equal(result, null);
    assert.deepEqual(capturedWhere, { id: "site-b", organizationId: "tenant-a" });
    assert.equal(updateCalled, false);
  } finally {
    prisma.site.findFirst = originalFindFirst;
    prisma.site.update = originalUpdate;
  }
});

test("NCI-069 confirmed location persists WGS84 coordinates for the scoped site", async () => {
  const originalFindFirst = prisma.site.findFirst;
  const originalUpdate = prisma.site.update;
  let capturedData: unknown;

  prisma.site.findFirst = (async () => ({ id: "site-1", organizationId: "tenant-1" })) as typeof prisma.site.findFirst;
  prisma.site.update = (async (args: unknown) => {
    capturedData = (args as { data?: unknown }).data;
    return { id: "site-1", organizationId: "tenant-1", latitude: 40.819, longitude: -73.917 };
  }) as unknown as typeof prisma.site.update;

  try {
    const result = await confirmAerialSiteLocation({
      actor: { role: "CLIENT_ADMIN", organizationId: "tenant-1" },
      siteId: "site-1",
      formattedAddress: "421 E 155th St, Bronx, NY 10455",
      latitude: 40.819,
      longitude: -73.917,
    });

    assert.deepEqual(capturedData, { latitude: 40.819, longitude: -73.917 });
    assert.equal(result?.formattedAddress, "421 E 155th St, Bronx, NY 10455");
  } finally {
    prisma.site.findFirst = originalFindFirst;
    prisma.site.update = originalUpdate;
  }
});

test("NCI-069 location confirmation rejects invalid coordinates before DB access", async () => {
  await assert.rejects(() => confirmAerialSiteLocation({
    actor: { role: "CLIENT_ADMIN", organizationId: "tenant-1" },
    siteId: "site-1",
    formattedAddress: "100 Main Street, New York, NY",
    latitude: 91,
    longitude: -74,
  }), /Invalid site coordinates/);
});
