import { z } from "zod";

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) => {
      const trimmed = trimString(value);

      if (trimmed === "") {
        return undefined;
      }

      return trimmed;
    },
    z.string().max(maxLength).optional()
  );
}

export function requiredTrimmedString(minLength: number, maxLength: number) {
  return z.preprocess(
    trimString,
    z.string().min(minLength).max(maxLength)
  );
}

export function optionalNumber() {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
      }

      return value;
    },
    z.number().finite().optional()
  );
}

export function optionalDate() {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string" || value instanceof Date) {
        return new Date(value);
      }

      return value;
    },
    z.date().optional()
  );
}
