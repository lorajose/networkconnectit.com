import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function configureManagedLinuxPrismaEngine() {
  if (process.platform !== "linux" || process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    return;
  }

  process.env.PRISMA_QUERY_ENGINE_LIBRARY = `${process.cwd()}/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node`;
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
