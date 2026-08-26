import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

type NodeDiagnosticReport = {
  header?: {
    glibcVersionRuntime?: string;
  };
};

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

configureManagedLinuxPrismaEngine();

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
