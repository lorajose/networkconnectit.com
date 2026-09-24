import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { AppRole } from "@/lib/rbac";

export type OperationsActor = {
  id: string;
  role: AppRole;
  organizationId: string | null;
};

function scopedOrganizationId(actor: OperationsActor, requested?: string) {
  if (actor.role === "SUPER_ADMIN" || actor.role === "INTERNAL_ADMIN") {
    if (!requested) throw new Error("Select an organization for Company Operations.");
    return requested;
  }
  if (!actor.organizationId) throw new Error("Your account is not assigned to an organization.");
  if (requested && requested !== actor.organizationId) throw new Error("Organization is outside your tenant scope.");
  return actor.organizationId;
}

export async function getOperationsSnapshot(actor: OperationsActor, requestedOrganizationId?: string) {
  const organizationId = scopedOrganizationId(actor, requestedOrganizationId);
  const [technicians, schedule, timeEntries, invoices, expenses] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; displayName: string; workerType: string; availabilityStatus: string; hourlyPayRate: Prisma.Decimal | null }>>(Prisma.sql`
      SELECT id, displayName, workerType, availabilityStatus, hourlyPayRate
      FROM FieldTechnicianProfile WHERE organizationId = ${organizationId}
      ORDER BY displayName ASC LIMIT 100`),
    prisma.$queryRaw<Array<{ id: string; title: string; technicianName: string; startsAt: Date; endsAt: Date; status: string }>>(Prisma.sql`
      SELECT s.id, s.title, t.displayName AS technicianName, s.startsAt, s.endsAt, s.status
      FROM OperationsScheduleEntry s
      JOIN FieldTechnicianProfile t ON t.id = s.technicianProfileId AND t.organizationId = s.organizationId
      WHERE s.organizationId = ${organizationId} AND s.endsAt >= NOW()
      ORDER BY s.startsAt ASC LIMIT 50`),
    prisma.$queryRaw<Array<{ id: string; technicianName: string; workDate: Date; regularHours: Prisma.Decimal; overtimeHours: Prisma.Decimal; status: string }>>(Prisma.sql`
      SELECT e.id, t.displayName AS technicianName, e.workDate, e.regularHours, e.overtimeHours, e.status
      FROM OperationsTimeEntry e
      JOIN FieldTechnicianProfile t ON t.id = e.technicianProfileId AND t.organizationId = e.organizationId
      WHERE e.organizationId = ${organizationId}
      ORDER BY e.workDate DESC, e.createdAt DESC LIMIT 50`),
    prisma.$queryRaw<Array<{ id: string; invoiceNumber: string; customerName: string; status: string; totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal; dueDate: Date | null }>>(Prisma.sql`
      SELECT id, invoiceNumber, customerName, status, totalAmount, paidAmount, dueDate
      FROM OperationsInvoice WHERE organizationId = ${organizationId}
      ORDER BY createdAt DESC LIMIT 50`),
    prisma.$queryRaw<Array<{ id: string; category: string; description: string; amount: Prisma.Decimal; expenseDate: Date; reimbursable: number | boolean }>>(Prisma.sql`
      SELECT id, category, description, amount, expenseDate, reimbursable
      FROM OperationsExpense WHERE organizationId = ${organizationId}
      ORDER BY expenseDate DESC, createdAt DESC LIMIT 50`)
  ]);

  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.totalAmount), 0);
  const paidTotal = invoices.reduce((sum, row) => sum + Number(row.paidAmount), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const laborHours = timeEntries.reduce((sum, row) => sum + Number(row.regularHours) + Number(row.overtimeHours), 0);

  return { organizationId, technicians, schedule, timeEntries, invoices, expenses, metrics: {
    technicianCount: technicians.length,
    upcomingAssignments: schedule.length,
    laborHours,
    invoiced: invoiceTotal,
    outstanding: invoiceTotal - paidTotal,
    expenses: expenseTotal
  }};
}

export async function createTechnician(actor: OperationsActor, input: {
  organizationId?: string; displayName: string; workerType: string; email?: string; hourlyPayRate?: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO FieldTechnicianProfile
      (id, organizationId, userId, displayName, status, workerType, email, hourlyPayRate, availabilityStatus, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${"ops:" + id}, ${input.displayName}, 'ACTIVE', ${input.workerType}, ${input.email || null}, ${input.hourlyPayRate ?? null}, 'AVAILABLE', NOW(3), NOW(3))`);
  return id;
}

export async function createInvoice(actor: OperationsActor, input: {
  organizationId?: string; invoiceNumber: string; customerName: string; totalAmount: number; dueDate?: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsInvoice
      (id, organizationId, invoiceNumber, customerName, status, dueDate, subtotal, totalAmount, paidAmount, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.invoiceNumber}, ${input.customerName}, 'DRAFT', ${input.dueDate ? new Date(input.dueDate) : null}, ${input.totalAmount}, ${input.totalAmount}, 0, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createExpense(actor: OperationsActor, input: {
  organizationId?: string; category: string; description: string; amount: number; expenseDate: string; reimbursable: boolean;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsExpense
      (id, organizationId, category, description, amount, expenseDate, reimbursable, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.category}, ${input.description}, ${input.amount}, ${new Date(input.expenseDate)}, ${input.reimbursable}, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createTimeEntry(actor: OperationsActor, input: {
  organizationId?: string; technicianProfileId: string; workDate: string; regularHours: number; overtimeHours: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  const tech = await prisma.$queryRaw<Array<{ id: string; hourlyPayRate: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT id, hourlyPayRate FROM FieldTechnicianProfile
    WHERE id = ${input.technicianProfileId} AND organizationId = ${organizationId} LIMIT 1`);
  if (!tech[0]) throw new Error("Technician is outside your tenant scope.");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsTimeEntry
      (id, organizationId, technicianProfileId, workDate, regularHours, overtimeHours, hourlyPayRateSnapshot, status, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.technicianProfileId}, ${new Date(input.workDate)}, ${input.regularHours}, ${input.overtimeHours}, ${tech[0].hourlyPayRate}, 'DRAFT', ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createScheduleEntry(actor: OperationsActor, input: {
  organizationId?: string; technicianProfileId: string; title: string; startsAt: string; endsAt: string; entryType: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  const tech = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM FieldTechnicianProfile
    WHERE id = ${input.technicianProfileId} AND organizationId = ${organizationId} LIMIT 1`);
  if (!tech[0]) throw new Error("Technician is outside your tenant scope.");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt < endsAt)) throw new Error("Schedule end must be after start.");
  const conflicts = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM OperationsScheduleEntry
    WHERE organizationId = ${organizationId}
      AND technicianProfileId = ${input.technicianProfileId}
      AND status <> 'CANCELLED'
      AND startsAt < ${endsAt} AND endsAt > ${startsAt}
    LIMIT 1`);
  if (conflicts[0]) throw new Error("Technician already has a conflicting schedule entry.");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsScheduleEntry
      (id, organizationId, technicianProfileId, entryType, title, startsAt, endsAt, status, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.technicianProfileId}, ${input.entryType}, ${input.title}, ${startsAt}, ${endsAt}, 'SCHEDULED', ${actor.id}, NOW(3), NOW(3))`);
  return id;
}