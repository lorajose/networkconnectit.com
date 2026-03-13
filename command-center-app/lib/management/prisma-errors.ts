import { Prisma } from "@prisma/client";

export function getUniqueConstraintFields(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map((field) => String(field));
    }
  }

  return [];
}
