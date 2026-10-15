// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

const url = new URL(process.env.DATABASE_URL || "mysql://invalid");
if (
  process.env.CI !== "true" ||
  url.hostname !== "127.0.0.1" ||
  url.pathname !== "/operations_ci_test"
) {
  throw new Error(
    "Requires CI=true and the disposable local operations_ci_test database."
  );
}

const prisma = new PrismaClient();

async function applyMigration(path) {
  const migration = fs.readFileSync(path, "utf8");
  for (const statement of migration
    .split(";")
    .map((sql) => sql.trim())
    .filter(Boolean)) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function main() {
  // Minimal parent tables needed by MenuBoard foreign keys. These are isolated
  // to the disposable CI database and do not model the full production schema.
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Organization (
    id VARCHAR(191) NOT NULL PRIMARY KEY
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Site (
    id VARCHAR(191) NOT NULL PRIMARY KEY
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS User (
    id VARCHAR(191) NOT NULL PRIMARY KEY
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  for (const migrationPath of [
    "prisma/migrations/20261013202500_nci083_menuboard_foundation/migration.sql",
    "prisma/migrations/20261013204500_nci086_deli_template/migration.sql",
    "prisma/migrations/20261013211500_nci087_atomic_publish/migration.sql",
    "prisma/migrations/20261013213000_nci084_menuboard_pairing/migration.sql"
  ]) {
    await applyMigration(migrationPath);
  }

  await prisma.$executeRawUnsafe(
    "INSERT INTO Organization (id) VALUES ('org-a'), ('org-b')"
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO Site (id) VALUES ('site-a'), ('site-b')"
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO User (id) VALUES ('user-a')"
  );

  await prisma.$executeRawUnsafe(`INSERT INTO MenuBoardScreen
    (id, organizationId, siteId, name, orientation, widthPx, heightPx, status,
     playerTokenHash, playerTokenIssuedAt, updatedAt)
    VALUES
    ('screen-a', 'org-a', 'site-a', 'Counter 01', 'LANDSCAPE', 1920, 1080,
     'OFFLINE', REPEAT('a', 64), NOW(3), NOW(3))`);

  await prisma.$executeRawUnsafe(`INSERT INTO Menu
    (id, organizationId, siteId, name, displayName, promotionTitle,
     promotionText, currency, templateKey, updatedAt)
    VALUES
    ('menu-a', 'org-a', 'site-a', 'Main Menu', 'CI Deli', 'Lunch Special',
     'Hero + soda', 'USD', 'DELI_LANDSCAPE_V1', NOW(3))`);

  await prisma.$executeRawUnsafe(`INSERT INTO MenuSection
    (id, organizationId, menuId, name, sortOrder, updatedAt)
    VALUES ('section-a', 'org-a', 'menu-a', 'Sandwiches', 0, NOW(3))`);

  await prisma.$executeRawUnsafe(`INSERT INTO MenuItem
    (id, organizationId, menuId, sectionId, name, description, priceCents,
     isAvailable, sortOrder, updatedAt)
    VALUES
    ('item-a', 'org-a', 'menu-a', 'section-a', 'Turkey Hero',
     'Turkey, lettuce, tomato', 999, TRUE, 0, NOW(3))`);

  await prisma.$executeRawUnsafe(`INSERT INTO MenuPairingCode
    (id, organizationId, screenId, codeHash, expiresAt)
    VALUES
    ('pair-a', 'org-a', 'screen-a', REPEAT('b', 64),
     DATE_ADD(NOW(3), INTERVAL 10 MINUTE))`);

  const payloadV1 = JSON.stringify({
    schemaVersion: 1,
    templateKey: "DELI_LANDSCAPE_V1",
    menuId: "menu-a",
    menuName: "Main Menu",
    storeDisplayName: "CI Deli",
    logoUrl: null,
    promotionTitle: "Lunch Special",
    promotionText: "Hero + soda",
    currency: "USD",
    sections: [
      {
        id: "section-a",
        name: "Sandwiches",
        items: [
          {
            id: "item-a",
            name: "Turkey Hero",
            description: "Turkey, lettuce, tomato",
            priceCents: 999,
            imageUrl: null
          }
        ]
      }
    ]
  });

  await prisma.$executeRawUnsafe(
    `INSERT INTO MenuPublish
      (id, organizationId, menuId, publishedByUserId, version, payload,
       payloadHash)
      VALUES (?, 'org-a', 'menu-a', 'user-a', ?, CAST(? AS JSON), ?)`,
    "publish-v1",
    1,
    payloadV1,
    "1".repeat(64)
  );

  await prisma.$executeRawUnsafe(`INSERT INTO MenuScreenAssignment
    (id, organizationId, screenId, menuId, activePublishId, updatedAt)
    VALUES
    ('assignment-a', 'org-a', 'screen-a', 'menu-a', 'publish-v1', NOW(3))`);

  await prisma.$executeRawUnsafe(`INSERT INTO MenuPlayerHeartbeat
    (id, organizationId, screenId, playerVersion, publishVersion)
    VALUES ('heartbeat-a', 'org-a', 'screen-a', 'web-player-v1', 1)`);

  const initial = await prisma.$queryRawUnsafe(`
    SELECT s.name AS screenName, s.playerTokenHash, m.displayName,
           mi.priceCents, a.activePublishId, p.version, h.playerVersion,
           h.publishVersion
    FROM MenuBoardScreen s
    JOIN MenuScreenAssignment a ON a.screenId = s.id
    JOIN Menu m ON m.id = a.menuId
    JOIN MenuItem mi ON mi.menuId = m.id
    JOIN MenuPublish p ON p.id = a.activePublishId
    JOIN MenuPlayerHeartbeat h ON h.screenId = s.id
    WHERE s.id = 'screen-a'
    ORDER BY h.receivedAt DESC
    LIMIT 1
  `);

  assert.equal(initial.length, 1);
  assert.equal(initial[0].screenName, "Counter 01");
  assert.equal(initial[0].displayName, "CI Deli");
  assert.equal(Number(initial[0].priceCents), 999);
  assert.equal(initial[0].activePublishId, "publish-v1");
  assert.equal(Number(initial[0].version), 1);
  assert.equal(initial[0].playerVersion, "web-player-v1");
  assert.equal(Number(initial[0].publishVersion), 1);
  assert.equal(initial[0].playerTokenHash.length, 64);

  await assert.rejects(
    () =>
      prisma.$executeRawUnsafe(
        `INSERT INTO MenuPublish
          (id, organizationId, menuId, publishedByUserId, version, payload,
           payloadHash)
          VALUES ('publish-duplicate', 'org-a', 'menu-a', 'user-a', 1,
           JSON_OBJECT('schemaVersion', 1), ?)`,
        "2".repeat(64)
      ),
    /Unique constraint|Duplicate entry/i
  );

  await assert.rejects(
    () =>
      prisma.$executeRawUnsafe(`INSERT INTO MenuBoardScreen
        (id, organizationId, siteId, name, orientation, widthPx, heightPx,
         status, playerTokenHash, updatedAt)
        VALUES
        ('screen-token-duplicate', 'org-a', 'site-a', 'Counter 02',
         'LANDSCAPE', 1920, 1080, 'OFFLINE', REPEAT('a', 64), NOW(3))`),
    /Unique constraint|Duplicate entry/i
  );

  await assert.rejects(
    () =>
      prisma.$executeRawUnsafe(`INSERT INTO MenuBoardScreen
        (id, organizationId, siteId, name, orientation, widthPx, heightPx,
         status, updatedAt)
        VALUES
        ('screen-invalid-org', 'org-missing', 'site-a', 'Invalid',
         'LANDSCAPE', 1920, 1080, 'UNPAIRED', NOW(3))`),
    /foreign key constraint/i
  );

  const payloadV2 = JSON.stringify({
    ...JSON.parse(payloadV1),
    sections: [
      {
        id: "section-a",
        name: "Sandwiches",
        items: [
          {
            id: "item-a",
            name: "Turkey Hero",
            description: "Turkey, lettuce, tomato",
            priceCents: 1099,
            imageUrl: null
          }
        ]
      }
    ]
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO MenuPublish
        (id, organizationId, menuId, publishedByUserId, version, payload,
         payloadHash)
        VALUES (?, 'org-a', 'menu-a', 'user-a', ?, CAST(? AS JSON), ?)`,
      "publish-v2",
      2,
      payloadV2,
      "3".repeat(64)
    );
    await tx.$executeRawUnsafe(
      "UPDATE MenuScreenAssignment SET activePublishId = 'publish-v2', updatedAt = NOW(3) WHERE id = 'assignment-a'"
    );
  });

  const activeV2 = await prisma.$queryRawUnsafe(`
    SELECT p.version,
           JSON_UNQUOTE(JSON_EXTRACT(p.payload, '$.sections[0].items[0].priceCents')) AS payloadPrice
    FROM MenuScreenAssignment a
    JOIN MenuPublish p ON p.id = a.activePublishId
    WHERE a.screenId = 'screen-a'
  `);
  assert.equal(Number(activeV2[0].version), 2);
  assert.equal(Number(activeV2[0].payloadPrice), 1099);

  await prisma.$executeRawUnsafe(
    "UPDATE MenuScreenAssignment SET activePublishId = 'publish-v1', updatedAt = NOW(3) WHERE id = 'assignment-a'"
  );
  const rollback = await prisma.$queryRawUnsafe(`
    SELECT p.version
    FROM MenuScreenAssignment a
    JOIN MenuPublish p ON p.id = a.activePublishId
    WHERE a.screenId = 'screen-a'
  `);
  assert.equal(Number(rollback[0].version), 1);

  const pairing = await prisma.$queryRawUnsafe(`
    SELECT consumedAt, expiresAt > NOW(3) AS stillValid
    FROM MenuPairingCode
    WHERE id = 'pair-a'
  `);
  assert.equal(pairing[0].consumedAt, null);
  assert.equal(Number(pairing[0].stillValid), 1);

  console.log(
    "PASS MenuBoard MySQL 8: migrations, FKs, unique credentials/versioning, " +
      "presentation metadata, pairing storage, heartbeat, atomic active publish switch and rollback."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
