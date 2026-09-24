import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { calendarDate, choice, nonNegativeDecimal, optionalEmail, requiredText, scopedOrganizationId, validateHours } from "./policy";
import type { OperationsActor } from "./policy";
export type { OperationsActor } from "./policy";

export async function getOperationsSnapshot(actor: OperationsActor, requestedOrganizationId?: string) {
  const organizationId = scopedOrganizationId(actor, requestedOrganizationId);
  const [technicians, projects, schedule, timeEntries, invoices, invoiceLines, expenses, projectProfitability, totals] = await Promise.all([
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
    prisma.$queryRaw<Array<{ id: string; invoiceId: string; lineType: string; description: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; amount: Prisma.Decimal }>>(Prisma.sql`
      SELECT id, invoiceId, lineType, description, quantity, unitPrice, amount
      FROM OperationsInvoiceLine
      WHERE organizationId = ${organizationId}
      ORDER BY invoiceId, sortOrder ASC LIMIT 250`),
    prisma.$queryRaw<Array<{ id: string; category: string; description: string; amount: Prisma.Decimal; expenseDate: Date; reimbursable: number | boolean }>>(Prisma.sql`
      SELECT id, category, description, amount, expenseDate, reimbursable
      FROM OperationsExpense WHERE organizationId = ${organizationId}
      ORDER BY expenseDate DESC, createdAt DESC LIMIT 50`),
    prisma.$queryRaw<Array<{
      id: string; name: string; projectCode: string | null; laborCost: Prisma.Decimal;
      expenses: Prisma.Decimal; revenue: Prisma.Decimal; outstanding: Prisma.Decimal;
    }>>(Prisma.sql`
      SELECT p.id, p.name, p.projectCode,
        COALESCE((SELECT SUM((t.regularHours + (t.overtimeHours * 1.5)) * COALESCE(t.hourlyPayRateSnapshot, 0))
          FROM OperationsTimeEntry t WHERE t.organizationId = p.organizationId
            AND t.projectInstallationId = p.id AND t.status IN ('DRAFT', 'SUBMITTED', 'APPROVED')), 0) AS laborCost,
        COALESCE((SELECT SUM(e.amount) FROM OperationsExpense e
          WHERE e.organizationId = p.organizationId AND e.projectInstallationId = p.id), 0) AS expenses,
        COALESCE((SELECT SUM(i.totalAmount) FROM OperationsInvoice i
          WHERE i.organizationId = p.organizationId AND i.projectInstallationId = p.id
            AND i.status IN ('SENT', 'PAID', 'OVERDUE')), 0) AS revenue,
        COALESCE((SELECT SUM(i.totalAmount - i.paidAmount) FROM OperationsInvoice i
          WHERE i.organizationId = p.organizationId AND i.projectInstallationId = p.id
            AND i.status IN ('SENT', 'PAID', 'OVERDUE')), 0) AS outstanding
      FROM ProjectInstallation p
      WHERE p.organizationId = ${organizationId}
      ORDER BY p.updatedAt DESC LIMIT 100`),
    // Aggregate independently of the capped detail lists. Drafts are not receivables.
    prisma.$queryRaw<Array<{
      technicianCount: bigint; upcomingAssignments: bigint; laborHours: Prisma.Decimal; scheduledHours: Prisma.Decimal; overdueInvoices: bigint;
      invoiced: Prisma.Decimal; outstanding: Prisma.Decimal; expenses: Prisma.Decimal;
    }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM FieldTechnicianProfile
         WHERE organizationId = ${organizationId} AND status = 'ACTIVE') AS technicianCount,
        (SELECT COUNT(*) FROM OperationsScheduleEntry
         WHERE organizationId = ${organizationId} AND status = 'SCHEDULED'
           AND entryType = 'ASSIGNMENT' AND endsAt >= NOW()) AS upcomingAssignments,
        (SELECT COALESCE(SUM(regularHours + overtimeHours), 0) FROM OperationsTimeEntry
         WHERE organizationId = ${organizationId} AND status IN ('DRAFT', 'SUBMITTED', 'APPROVED')
           AND workDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND workDate <= CURRENT_DATE()) AS laborHours,
        (SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,
           GREATEST(startsAt, DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)),
           LEAST(endsAt, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)))) / 60, 0)
         FROM OperationsScheduleEntry
         WHERE organizationId = ${organizationId} AND entryType = 'ASSIGNMENT' AND status = 'SCHEDULED'
           AND endsAt > DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
           AND startsAt < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)) AS scheduledHours,
        (SELECT COUNT(*) FROM OperationsInvoice
         WHERE organizationId = ${organizationId} AND status IN ('SENT', 'OVERDUE')
           AND dueDate IS NOT NULL AND dueDate < CURRENT_DATE() AND paidAmount < totalAmount) AS overdueInvoices,
        (SELECT COALESCE(SUM(totalAmount), 0) FROM OperationsInvoice
         WHERE organizationId = ${organizationId} AND status IN ('SENT', 'PAID', 'OVERDUE')) AS invoiced,
        (SELECT COALESCE(SUM(totalAmount - paidAmount), 0) FROM OperationsInvoice
         WHERE organizationId = ${organizationId} AND status IN ('SENT', 'PAID', 'OVERDUE')) AS outstanding,
        (SELECT COALESCE(SUM(amount), 0) FROM OperationsExpense
         WHERE organizationId = ${organizationId}) AS expenses`)
  ]);

  const total = totals[0];
  if (!total) throw new Error("Operations totals are unavailable.");
  const profitability = projectProfitability.map((project) => { const revenue = Number(project.revenue); const laborCost = Number(project.laborCost); const expenses = Number(project.expenses); const grossProfit = revenue - laborCost - expenses; return { ...project, laborCost, expenses, revenue, outstanding: Number(project.outstanding), grossProfit, marginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : null }; });
  return { organizationId, technicians, projects, schedule, timeEntries, invoices, invoiceLines, expenses, projectProfitability: profitability, metrics: {
    technicianCount: Number(total.technicianCount),
    upcomingAssignments: Number(total.upcomingAssignments),
    laborHours: Number(total.laborHours),
    scheduledHours: Number(total.scheduledHours),
    utilizationPercent: Number(total.scheduledHours) > 0 ? (Number(total.laborHours) / Number(total.scheduledHours)) * 100 : null,
    overdueInvoices: Number(total.overdueInvoices),
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
  organizationId?: string; projectInstallationId?: string; invoiceNumber: string; customerName: string; dueDate?: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceNumber = requiredText(input.invoiceNumber, "Invoice number", 64);
  input.customerName = requiredText(input.customerName, "Customer name", 255);
  const dueDate = input.dueDate ? calendarDate(input.dueDate, "due date") : null;
  const projectInstallationId = input.projectInstallationId ? requiredText(input.projectInstallationId, "Project", 191) : null;
  if (projectInstallationId) {
    const project = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ProjectInstallation WHERE id = ${projectInstallationId} AND organizationId = ${organizationId} LIMIT 1`);
    if (!project[0]) throw new Error("Project is outside your tenant scope.");
  }
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsInvoice
      (id, organizationId, projectInstallationId, invoiceNumber, customerName, status, dueDate, subtotal, totalAmount, paidAmount, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${projectInstallationId}, ${input.invoiceNumber}, ${input.customerName}, 'DRAFT', ${dueDate}, 0, 0, 0, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createExpense(actor: OperationsActor, input: {
  organizationId?: string; projectInstallationId?: string; category: string; description: string; amount: number; expenseDate: string; reimbursable: boolean;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  choice(input.category, ["MATERIALS", "TRAVEL", "TOOLS", "SUBCONTRACTOR", "OTHER"], "expense category");
  input.description = requiredText(input.description, "Expense description", 512);
  nonNegativeDecimal(input.amount, "Expense amount", 999999999999.99);
  const expenseDate = calendarDate(input.expenseDate, "expense date");
  const projectInstallationId = input.projectInstallationId ? requiredText(input.projectInstallationId, "Project", 191) : null;
  if (projectInstallationId) {
    const project = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ProjectInstallation WHERE id = ${projectInstallationId} AND organizationId = ${organizationId} LIMIT 1`);
    if (!project[0]) throw new Error("Project is outside your tenant scope.");
  }
  if (typeof input.reimbursable !== "boolean") throw new Error("Invalid reimbursable flag.");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsExpense
      (id, organizationId, projectInstallationId, category, description, amount, expenseDate, reimbursable, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${projectInstallationId}, ${input.category}, ${input.description}, ${input.amount}, ${expenseDate}, ${input.reimbursable}, ${actor.id}, NOW(3), NOW(3))`);
  return id;
}

export async function createTimeEntry(actor: OperationsActor, input: {
  organizationId?: string; technicianProfileId: string; projectInstallationId?: string; workDate: string; regularHours: number; overtimeHours: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  validateHours(input.regularHours, input.overtimeHours);
  const workDate = calendarDate(input.workDate, "work date");
  requiredText(input.technicianProfileId, "Technician", 191);
  const tech = await prisma.$queryRaw<Array<{ id: string; hourlyPayRate: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT id, hourlyPayRate FROM FieldTechnicianProfile
    WHERE id = ${input.technicianProfileId} AND organizationId = ${organizationId} LIMIT 1`);
  if (!tech[0]) throw new Error("Technician is outside your tenant scope.");
  const projectInstallationId = input.projectInstallationId ? requiredText(input.projectInstallationId, "Project", 191) : null;
  if (projectInstallationId) {
    const project = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ProjectInstallation WHERE id = ${projectInstallationId} AND organizationId = ${organizationId} LIMIT 1`);
    if (!project[0]) throw new Error("Project is outside your tenant scope.");
  }
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO OperationsTimeEntry
      (id, organizationId, technicianProfileId, projectInstallationId, workDate, regularHours, overtimeHours, hourlyPayRateSnapshot, status, createdByUserId, createdAt, updatedAt)
    VALUES
      (${id}, ${organizationId}, ${input.technicianProfileId}, ${projectInstallationId}, ${workDate}, ${input.regularHours}, ${input.overtimeHours}, ${tech[0].hourlyPayRate}, 'DRAFT', ${actor.id}, NOW(3), NOW(3))`);
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


export async function recordInvoicePayment(actor: OperationsActor, input: {
  organizationId?: string; invoiceId: string; amount: number; paidAt: string; method?: string; reference?: string;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceId = requiredText(input.invoiceId, "Invoice", 191);
  nonNegativeDecimal(input.amount, "Payment amount", 999999999999.99);
  if (input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const paidAt = new Date(input.paidAt);
  if (Number.isNaN(paidAt.getTime())) throw new Error("Invalid payment date.");
  const method = input.method ? requiredText(input.method, "Payment method", 32) : null;
  const reference = input.reference ? requiredText(input.reference, "Payment reference", 191) : null;

  return prisma.$transaction(async (tx) => {
    const invoices = await tx.$queryRaw<Array<{ id: string; totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal; status: string }>>(Prisma.sql`
      SELECT id, totalAmount, paidAmount, status FROM OperationsInvoice
      WHERE id = ${input.invoiceId} AND organizationId = ${organizationId}
      LIMIT 1 FOR UPDATE`);
    const invoice = invoices[0];
    if (!invoice) throw new Error("Invoice is outside your tenant scope.");
    if (invoice.status === "DRAFT") throw new Error("Draft invoices cannot receive payments.");
    const totalAmount = Number(invoice.totalAmount);
    const paidAmount = Number(invoice.paidAmount);
    const nextPaidAmount = paidAmount + input.amount;
    if (nextPaidAmount > totalAmount) throw new Error("Payment exceeds the invoice outstanding balance.");

    const id = randomUUID();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO OperationsPayment
        (id, organizationId, invoiceId, amount, paidAt, method, reference, createdByUserId, createdAt)
      VALUES
        (${id}, ${organizationId}, ${input.invoiceId}, ${input.amount}, ${paidAt}, ${method}, ${reference}, ${actor.id}, NOW(3))`);
    const nextStatus = nextPaidAmount === totalAmount ? "PAID" : invoice.status;
    await tx.$executeRaw(Prisma.sql`
      UPDATE OperationsInvoice SET paidAmount = ${nextPaidAmount}, status = ${nextStatus}, updatedAt = NOW(3)
      WHERE id = ${input.invoiceId} AND organizationId = ${organizationId}`);
    return id;
  });
}


export async function sendInvoice(actor: OperationsActor, input: { organizationId?: string; invoiceId: string }) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceId = requiredText(input.invoiceId, "Invoice", 191);
  const updated = await prisma.$executeRaw(Prisma.sql`
    UPDATE OperationsInvoice
    SET status = 'SENT', issueDate = COALESCE(issueDate, CURRENT_DATE()), updatedAt = NOW(3)
    WHERE id = ${input.invoiceId} AND organizationId = ${organizationId} AND status = 'DRAFT'`);
  if (updated !== 1) throw new Error("Invoice is outside your tenant scope or is not a draft.");
}



export async function updateInvoiceAdjustments(actor: OperationsActor, input: {
  organizationId?: string; invoiceId: string; taxAmount: number; discountAmount: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceId = requiredText(input.invoiceId, "Invoice", 191);
  nonNegativeDecimal(input.taxAmount, "Tax amount", 999999999999.99);
  nonNegativeDecimal(input.discountAmount, "Discount amount", 999999999999.99);

  return prisma.$transaction(async (tx) => {
    const invoices = await tx.$queryRaw<Array<{ id: string; status: string; subtotal: Prisma.Decimal }>>(Prisma.sql`
      SELECT id, status, subtotal FROM OperationsInvoice
      WHERE id = ${input.invoiceId} AND organizationId = ${organizationId}
      LIMIT 1 FOR UPDATE`);
    const invoice = invoices[0];
    if (!invoice) throw new Error("Invoice is outside your tenant scope.");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");
    const subtotal = Number(invoice.subtotal);
    const totalAmount = Math.max(0, Math.round((subtotal + input.taxAmount - input.discountAmount) * 100) / 100);
    await tx.$executeRaw(Prisma.sql`
      UPDATE OperationsInvoice SET taxAmount = ${input.taxAmount}, discountAmount = ${input.discountAmount},
        totalAmount = ${totalAmount}, updatedAt = NOW(3)
      WHERE id = ${input.invoiceId} AND organizationId = ${organizationId}`);
    return totalAmount;
  });
}

export async function addInvoiceLine(actor: OperationsActor, input: {
  organizationId?: string; invoiceId: string; lineType: string; description: string; quantity: number; unitPrice: number;
}) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.invoiceId = requiredText(input.invoiceId, "Invoice", 191);
  choice(input.lineType, ["SERVICE", "LABOR", "MATERIAL", "TRAVEL", "OTHER"], "invoice line type");
  input.description = requiredText(input.description, "Line description", 512);
  nonNegativeDecimal(input.quantity, "Quantity", 999999999.999);
  nonNegativeDecimal(input.unitPrice, "Unit price", 999999999999.99);
  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
  const amount = Math.round(input.quantity * input.unitPrice * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const invoices = await tx.$queryRaw<Array<{ id: string; status: string }>>(Prisma.sql`
      SELECT id, status FROM OperationsInvoice
      WHERE id = ${input.invoiceId} AND organizationId = ${organizationId}
      LIMIT 1 FOR UPDATE`);
    const invoice = invoices[0];
    if (!invoice) throw new Error("Invoice is outside your tenant scope.");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");

    const id = randomUUID();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO OperationsInvoiceLine
        (id, organizationId, invoiceId, lineType, description, quantity, unitPrice, amount, sortOrder, createdAt)
      VALUES
        (${id}, ${organizationId}, ${input.invoiceId}, ${input.lineType}, ${input.description}, ${input.quantity}, ${input.unitPrice}, ${amount},
         (SELECT COALESCE(MAX(existing.sortOrder), -1) + 1 FROM OperationsInvoiceLine existing WHERE existing.organizationId = ${organizationId} AND existing.invoiceId = ${input.invoiceId}), NOW(3))`);
    await tx.$executeRaw(Prisma.sql`
      UPDATE OperationsInvoice i SET
        i.subtotal = (SELECT COALESCE(SUM(l.amount), 0) FROM OperationsInvoiceLine l WHERE l.organizationId = ${organizationId} AND l.invoiceId = ${input.invoiceId}),
        i.totalAmount = GREATEST(0,
          (SELECT COALESCE(SUM(l.amount), 0) FROM OperationsInvoiceLine l WHERE l.organizationId = ${organizationId} AND l.invoiceId = ${input.invoiceId})
          + i.taxAmount - i.discountAmount),
        i.updatedAt = NOW(3)
      WHERE i.id = ${input.invoiceId} AND i.organizationId = ${organizationId}`);
    return id;
  });
}


export async function submitTimeEntry(actor: OperationsActor, input: { organizationId?: string; timeEntryId: string }) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.timeEntryId = requiredText(input.timeEntryId, "Time entry", 191);
  const updated = await prisma.$executeRaw(Prisma.sql`
    UPDATE OperationsTimeEntry SET status = 'SUBMITTED', updatedAt = NOW(3)
    WHERE id = ${input.timeEntryId} AND organizationId = ${organizationId} AND status = 'DRAFT'`);
  if (updated !== 1) throw new Error("Time entry is outside your tenant scope or is not a draft.");
}

export async function approveTimeEntry(actor: OperationsActor, input: { organizationId?: string; timeEntryId: string }) {
  const organizationId = scopedOrganizationId(actor, input.organizationId);
  input.timeEntryId = requiredText(input.timeEntryId, "Time entry", 191);
  const updated = await prisma.$executeRaw(Prisma.sql`
    UPDATE OperationsTimeEntry
    SET status = 'APPROVED', approvedByUserId = ${actor.id}, approvedAt = NOW(3), updatedAt = NOW(3)
    WHERE id = ${input.timeEntryId} AND organizationId = ${organizationId} AND status = 'SUBMITTED'`);
  if (updated !== 1) throw new Error("Time entry is outside your tenant scope or is not submitted.");
}
