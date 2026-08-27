import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

type NodeDiagnosticReport = {
  header?: {
    glibcVersionRuntime?: string;
  };
};

function configureDatabaseUrlFromDiscreteSecrets() {
  const rawDatabaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  let pointsToLoopback = false;
  if (rawDatabaseUrl) {
    try {
      const parsed = new URL(rawDatabaseUrl);
      pointsToLoopback =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      pointsToLoopback = false;
    }
  }

  if (rawDatabaseUrl && !pointsToLoopback) {
    return;
  }

  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !database || !user) {
    return;
  }

  process.env.DATABASE_URL =
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}`;

  console.info(
    `Using DB_* secrets for Prisma database connection: ${host}:${port}/${database}`
  );
}

function configureManagedLinuxPrismaEngine() {
  if (process.platform !== "linux" || process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    return;
  }

  const report = process.report?.getReport?.();
  const glibcVersion =
    report && typeof report === "object" && "header" in report
      ? (report as NodeDiagnosticReport).header?.glibcVersionRuntime
      : undefined;
  const engineFile = glibcVersion
    ? "libquery_engine-debian-openssl-3.0.x.so.node"
    : "libquery_engine-linux-musl-openssl-3.0.x.so.node";

  process.env.PRISMA_QUERY_ENGINE_LIBRARY =
    `${process.cwd()}/node_modules/.prisma/client/${engineFile}`;
}

configureDatabaseUrlFromDiscreteSecrets();
configureManagedLinuxPrismaEngine();

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
