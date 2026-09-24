"use server";

import { revalidatePath } from "next/cache";

import { requireRoles } from "@/lib/auth";
import { createExpense, createInvoice, createScheduleEntry, createTechnician, createTimeEntry, recordInvoicePayment, sendInvoice } from "@/lib/company-operations/repository";
import { routeAccess } from "@/lib/rbac";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function number(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number.`);
  return value;
}
async function actor() {
  const user = await requireRoles(routeAccess.companyOperations);
  return { id: user.id, role: user.role, organizationId: user.organizationId };
}
function org(formData: FormData) {
  return text(formData, "organizationId") || undefined;
}
function refresh() { revalidatePath("/operations"); }

export async function createTechnicianAction(formData: FormData) {
  const user = await actor();
  const displayName = text(formData, "displayName");
  if (!displayName) throw new Error("Technician name is required.");
  await createTechnician(user, {
    organizationId: org(formData), displayName,
    workerType: text(formData, "workerType") || "1099",
    email: text(formData, "email") || undefined,
    hourlyPayRate: text(formData, "hourlyPayRate") ? number(formData, "hourlyPayRate") : undefined
  });
  refresh();
}

export async function createScheduleAction(formData: FormData) {
  const user = await actor();
  await createScheduleEntry(user, {
    organizationId: org(formData),
    technicianProfileId: text(formData, "technicianProfileId"),
    projectInstallationId: text(formData, "projectInstallationId") || undefined,
    title: text(formData, "title"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    entryType: text(formData, "entryType") || "ASSIGNMENT"
  });
  refresh();
}

export async function createTimeEntryAction(formData: FormData) {
  const user = await actor();
  await createTimeEntry(user, {
    organizationId: org(formData),
    technicianProfileId: text(formData, "technicianProfileId"),
    projectInstallationId: text(formData, "projectInstallationId") || undefined,
    workDate: text(formData, "workDate"),
    regularHours: number(formData, "regularHours"),
    overtimeHours: number(formData, "overtimeHours")
  });
  refresh();
}

export async function createInvoiceAction(formData: FormData) {
  const user = await actor();
  await createInvoice(user, {
    organizationId: org(formData),
    projectInstallationId: text(formData, "projectInstallationId") || undefined,
    invoiceNumber: text(formData, "invoiceNumber"),
    customerName: text(formData, "customerName"),
    totalAmount: number(formData, "totalAmount"),
    dueDate: text(formData, "dueDate") || undefined
  });
  refresh();
}

export async function createExpenseAction(formData: FormData) {
  const user = await actor();
  await createExpense(user, {
    organizationId: org(formData),
    projectInstallationId: text(formData, "projectInstallationId") || undefined,
    category: text(formData, "category") || "OTHER",
    description: text(formData, "description"),
    amount: number(formData, "amount"),
    expenseDate: text(formData, "expenseDate"),
    reimbursable: formData.get("reimbursable") === "on"
  });
  refresh();
}

export async function sendInvoiceAction(formData: FormData) {
  const user = await actor();
  await sendInvoice(user, { organizationId: org(formData), invoiceId: text(formData, "invoiceId") });
  refresh();
}

export async function recordInvoicePaymentAction(formData: FormData) {
  const user = await actor();
  await recordInvoicePayment(user, {
    organizationId: org(formData),
    invoiceId: text(formData, "invoiceId"),
    amount: number(formData, "amount"),
    paidAt: text(formData, "paidAt"),
    method: text(formData, "method") || undefined,
    reference: text(formData, "reference") || undefined
  });
  refresh();
}
