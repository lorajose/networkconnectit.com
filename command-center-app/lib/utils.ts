import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatOptionalDateTime(value?: string | Date | null) {
  if (!value) {
    return "Not available";
  }

  return formatDateTime(
    typeof value === "string" ? value : value.toISOString()
  );
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatLocation(parts: Array<string | null | undefined>) {
  const presentParts = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return presentParts.length ? presentParts.join(", ") : "Not specified";
}
