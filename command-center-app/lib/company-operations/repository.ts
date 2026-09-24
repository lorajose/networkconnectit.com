import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { calendarDate, choice, nonNegativeDecimal, optionalEmail, requiredText, scopedOrganizationId, validateHours } from "./policy";
import type { OperationsActor } from "./policy";
export type { OperationsActor } from "./policy";

export async function getOperationsSnapshot(actor: OperationsActor, requestedOrganizationId?: string) {
  const organizationId = scopedOrganizationId(actor, requestedOrganizationId);
  const [technicians, projects, schedule, timeEntries, invoices, expenses, totals] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; displayName: string; workerType: string; availabilityStatus: string; hourlyPayRate: Prisma.Decimal | null }>>(Prisma.sql`
      SELECT id, displayName, workerType, availabilityStatus, hourlyPayRate
      FROM FieldTechnicianProfile WHERE organizationId = ${organizationId}
      ORDER BY displayName ASC LIMIT 100`),
    prisma.$queryRaw<Array<{ id: string; name: string; projectCode: string | null }>>(Prisma.sql`
      SELECT id, name, projectCode FROM ProjectInstallation
      WHERE organizationId = ${organizationId} AND status NOT IN ('COMPLETE', 'ARCHIVED')
      ORDER BY updatedAt DESC LIMIT 100`),
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
      ORDER BY expenseDate DESC, createdAt DESC LIMIT 50`),
    // Aggregate independently of the capped detail lists. Drafts are not receivables.
    prisma.$queryRaw<Array<{
      technicianCount: bigint; upcomingAssignments: bigint; laborHours: Prisma.Decimal;
      invoiced: Prisma.Decimal; outstanding: Prisma.Decimal; expenses: Prisma.Decimal;
    }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM FieldTechnicianProfile
         WHERE organizationId = ${organizationId} AND status = 'ACTIVE') AS technicianCount,
        (SELECT COUNT(*) FROM OperationsScheduleEntry
         WHERE organizationId = ${organizationId} AND status = 'SCHEDULED'
           AND entryType = 'ASSIGNMENT' AND endsAt >= NOW()) AS upcomingAssignments,
        (SELECT COALESCE(SUM(regularHours + overtimeHours), 0) FROM OperationsTimeEntry
         WHERE organizationId = ${organizationId} AND status IN ('DRAFT', 'SUBMITTED', 'APPROVED')) AS laborHours,
        (SELECT COALESCE(SUM(totalAmount), 0) FROM OperationsInvoice
         WHERE organizationId = ${organizationId} AND status IN ('SENT', 'PAID', 'OVERDUE')) AS invoiced,
        (SELECT COALESCE(SUM(totalAmount - paidAmount), 0) FROM OperationsInvoice
         WHERE organizationId = ${organizationId} AND status IN ('SENT', 'PAID', 'OVERDUE')) AS outstanding,
        (SELECT COALESCE(SUM(amount), 0) FROM OperationsExpense
         WHERE organizationId = ${organizationId}) AS expenses`)
  ]);

  const total = totals[0];
  if (!total) throw new Error("Operations totals are unavailable.");
  return { organizationId, technicians, projects, schedule, timeEntries, invoices, expenses, metrics: {
    technicianCount: Number(total.technicianCount),
    upcomingAssignments: Number(total.upcomingAssignments),
    laborHours: Number(total.laborHours),
    invoiced: Number(total.invoiced),
    outstanding: Number(total.outstanding),
    expenses: Number(total.expenses)
  }};
}

export async function createTechnician(actor: OperationsActor, input: {
  organizationId?: string; displayName: string; workerType: string; email?: string; hourlyPayRate?: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.displayName = requiredText(input.displayName, "Technician name", 191);
  choice(input.workerType, ["1099", "W2"], "worker type");
  const email = optionalEmail(input.email);
  if (input.hourlyPayRate !== undefined) nonNegativeDecimal(input.hourlyPayRate, "Hourly rate", 9999999999.99);
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO FieldTechnicianProfile
      (id, organizationId, userId, displayName, status, workerType, email, hourlyPayRate, availabilityStatus, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${"ops:" + id}, ${input.displayName}, 'ACTIVE', ${input.workerType}, ${email}, ${input.hourlyPayRate ?? null}, 'AVAILABLE', NOW(3), NOW(3))`);
  return id;
}

export async function createInvoice(actor: OperationsActor, input: {
  organizationId?: string; invoiceNumber: string; customerName: string; totalAmount: number; dueDate?: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceNumber = requiredText(input.invoiceNumber, "Invoice number", 64);
  input.customerName = requiredText(input.customerName, "Customer name", 255);
  nonNegativeDecimal(input.totalAmount, "Invoice total", 999999999999.99);
  const dueDate = input.dueDate ? calendarDate(input.dueDate, "due date") : null;
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsInvoice
      (id, organizationId, invoiceNumber, customerName, status, dueDate, subtotal, totalAmount, paidAmount, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.invoiceNumber}, ${input.customerName}, 'DRAFT', ${dueDate}, ${input.totalAmount}, ${input.totalAmount}, 0, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createExpense(actor: OperationsActor, input: {
  organizationId?: string; category: string; description: string; amount: number; expenseDate: string; reimbursable: boolean;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  choice(input.category, ["MATERIALS", "TRAVEL", "TOOLS", "SUBCONTRACTOR", "OTHER"], "expense category");
  input.description = requiredText(input.description, "Expense description", 512);
  nonNegativeDecimal(input.amount, "Expense amount", 999999999999.99);
  const expenseDate = calendarDate(input.expenseDate, "expense date");
  if (typeof input.reimbursable !== "boolean") throw new Error("Invalid reimbursable flag.");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsExpense
      (id, organizationId, category, description, amount, expenseDate, reimbursable, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.category}, ${input.description}, ${input.amount}, ${expenseDate}, ${input.reimbursable}, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createTimeEntry(actor: OperationsActor, input: {
  organizationId?: string; technicianProfileId: string; workDate: string; regularHours: number; overtimeHours: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  validateHours(input.regularHours, input.overtimeHours);
  const workDate = calendarDate(input.workDate, "work date");
  requiredText(input.technicianProfileId, "Technician", 191);
  const tech = await prisma.$queryRaw<Array<{ id: string; hourlyPayRate: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT id, hourlyPayRate FROM FieldTechnicianProfile
    WHERE id = ${input.technicianProfileId} AND organizationId = ${organizationId} LIMIT 1`);
  if (!tech[0]) throw new Error("Technician is outside your tenant scope.");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsTimeEntry
      (id, organizationId, technicianProfileId, workDate, regularHours, overtimeHours, hourlyPayRateSnapshot, status, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.technicianProfileId}, ${workDate}, ${input.regularHours}, ${input.overtimeHours}, ${tech[0].hourlyPayRate}, 'DRAFT', ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createScheduleEntry(actor: OperationsActor, input: {
  organizationId?: string; technicianProfileId: string; projectInstallationId?: string; title: string; startsAt: string; endsAt: string; entryType: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  requiredText(input.technicianProfileId, "Technician", 191);
  input.title = requiredText(input.title, "Schedule title", 255);
  const projectInstallationId = input.projectInstallationId ? requiredText(input.projectInstallationId, "Project", 191) : null;
  choice(input.entryType, ["ASSIGNMENT", "AVAILABLE", "UNAVAILABLE", "PTO"], "schedule type");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt < endsAt)) throw new Error("Schedule end must be after start.");

  // Serialize bookings on the tenant-owned technician row, including the first
  // booking when there are no schedule rows to lock yet. Every schedule writer
  // must acquire this lock before checking conflicts or modifying the calendar.
  return prisma.$transaction(async (tx) => {
    const tech = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM FieldTechnicianProfile
      WHERE id = ${input.technicianProfileId} AND organizationId = ${organizationId}
        AND status = 'ACTIVE'
      LIMIT 1 FOR UPDATE`);
    if (!tech[0]) throw new Error("Technician is inactive or outside your tenant scope.");
    if (projectInstallationId) {
      const project = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM ProjectInstallation
        WHERE id = ${projectInstallationId} AND organizationId = ${organizationId} LIMIT 1`);
      if (!project[0]) throw new Error("Project is outside your tenant scope.");
    }

    // AVAILABLE is advisory availability, not a reservation. Assignments, PTO
    // and unavailable periods block each other; adjacent intervals are allowed.
    if (input.entryType !== "AVAILABLE") {
      const conflicts = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM OperationsScheduleEntry
        WHERE organizationId = ${organizationId}
          AND technicianProfileId = ${input.technicianProfileId}
          AND status <> 'CANCELLED'
          AND entryType <> 'AVAILABLE'
          AND startsAt < ${endsAt} AND endsAt > ${startsAt}
        LIMIT 1 FOR UPDATE`);
      if (conflicts[0]) throw new Error("Technician already has a conflicting schedule entry.");
    }
    const id = randomUUID();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO OperationsScheduleEntry
        (id, organizationId, technicianProfileId, projectInstallationId, entryType, title, startsAt, endsAt, status, createdByUserId, createdAt, updatedAt)
      VALUES
        (${id}, ${organizationId}, ${input.technicianProfileId}, ${projectInstallationId}, ${input.entryType}, ${input.title}, ${startsAt}, ${endsAt}, 'SCHEDULED', ${actor.id}, NOW(3), NOW(3))`);
    return id;
  });
}
