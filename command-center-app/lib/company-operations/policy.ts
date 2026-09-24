import type { AppRole } from "../rbac";

export type OperationsActor = { id: string; role: AppRole; organizationId: string | null };

export function scopedOrganizationId(actor: OperationsActor, requested?: string) {
  if (!actor.id || !["SUPER_ADMIN", "INTERNAL_ADMIN", "CLIENT_ADMIN"].includes(actor.role)) {
    throw new Error("Company Operations requires an administrator role.");
  }
  if (actor.role === "SUPER_ADMIN" || actor.role === "INTERNAL_ADMIN") {
    return requiredText(requested, "Organization", 191);
  }
  if (!actor.organizationId) throw new Error("Your account is not assigned to an organization.");
  if (requested && requested !== actor.organizationId) throw new Error("Organization is outside your tenant scope.");
  return actor.organizationId;
}

export function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`${label} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

export function choice(value: string, values: readonly string[], label: string) {
  if (!values.includes(value)) throw new Error(`Invalid ${label}.`);
  return value;
}

export function nonNegativeDecimal(value: number, label: string, max: number) {
  if (!Number.isFinite(value) || value < 0 || value > max || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) {
    throw new Error(`${label} must be a non-negative number with at most two decimal places, up to ${max}.`);
  }
  return value;
}

export function calendarDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) throw new Error(`Invalid ${label}.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${label}.`);
  return date;
}

export function validateHours(regular: number, overtime: number) {
  nonNegativeDecimal(regular, "Regular hours", 24);
  nonNegativeDecimal(overtime, "Overtime hours", 24);
  if (regular + overtime <= 0 || regular + overtime > 24) throw new Error("Total hours must be greater than zero and at most 24 per entry.");
}

export function optionalEmail(value?: string) {
  if (!value?.trim()) return null;
  const email = requiredText(value, "Email", 255);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email.");
  return email;
}
