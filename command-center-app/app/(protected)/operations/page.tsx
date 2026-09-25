import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getOperationsSettings, getOperationsSnapshot, getScheduleCalendar } from "@/lib/company-operations/repository";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { routeAccess } from "@/lib/rbac";

import { addInvoiceLineAction, approveTimeEntryAction, createExpenseAction, createInvoiceAction, createScheduleAction, createTechnicianAction, createTimeEntryAction, recordInvoicePaymentAction, sendInvoiceAction, submitTimeEntryAction, updateInvoiceAdjustmentsAction, updateOperationsSettingsAction, updateTechnicianProfileAction } from "./actions";

type Props = { searchParams?: Record<string, string | string[] | undefined> };
const money = (value: number | null) => value === null ? "Restricted" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value) : "—";
const technicianSkills = (value: string | null) => { try { const parsed: unknown = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join(", ") : ""; } catch { return ""; } };
const technicianCertifications = (value: string | null) => { try { const parsed: unknown = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.map((item) => item && typeof item === "object" && "name" in item ? String((item as { name?: unknown }).name ?? "") : "").filter(Boolean).join(", ") : ""; } catch { return ""; } };
const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm";
const button = "h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground";

export default async function OperationsPage({ searchParams = {} }: Props) {
  const user = await requireRoles(routeAccess.companyOperations);
  const organizations = await getOrganizationOptions(user);
  const requested = typeof searchParams.organizationId === "string" ? searchParams.organizationId : undefined;
  const organizationId = user.organizationId || requested || organizations[0]?.id;

  if (!organizationId) return <PageHeader eyebrow="Company Operations" title="No organization available" description="Create an organization before using the operations workspace." />;

  const operationsActor = { id: user.id, role: user.role, organizationId: user.organizationId };
  const [snapshot, settings] = await Promise.all([getOperationsSnapshot(operationsActor, organizationId), getOperationsSettings(operationsActor, organizationId)]);
  const org = organizations.find((item) => item.id === organizationId);

  const calendarView = searchParams.view === "day" ? "day" : "week";
  const calendarTimeZone = typeof searchParams.timeZone === "string" ? searchParams.timeZone : "America/New_York";
  const requestedDate = typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : new Date().toISOString().slice(0, 10);
  const baseDate = new Date(`${requestedDate}T12:00:00Z`);
  const day = baseDate.getUTCDay();
  const offset = calendarView === "week" ? (day + 6) % 7 : 0;
  const rangeStart = new Date(baseDate); rangeStart.setUTCDate(baseDate.getUTCDate() - offset);
  const rangeEnd = new Date(rangeStart); rangeEnd.setUTCDate(rangeStart.getUTCDate() + (calendarView === "week" ? 7 : 1));
  const localStamp = (d: Date) => `${d.toISOString().slice(0, 10)}T00:00:00`;
  const calendar = await getScheduleCalendar(
    { id: user.id, role: user.role, organizationId: user.organizationId },
    { organizationId, startLocal: localStamp(rangeStart), endLocal: localStamp(rangeEnd), timeZone: calendarTimeZone }
  );
  const calendarFormatter = new Intl.DateTimeFormat("en-US", { timeZone: calendarTimeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (user.role === "VIEWER") {
    return <div className="space-y-6">
      <PageHeader eyebrow="Contractor OS" title="Company Operations" description="Read-only field/client operations view for your organization." breadcrumbs={[{ label: "Command Center", href: "/dashboard" }, { label: "Company Operations" }]} />
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Active technicians</p><p className="mt-2 text-2xl font-semibold">{snapshot.metrics.technicianCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming assignments</p><p className="mt-2 text-2xl font-semibold">{snapshot.metrics.upcomingAssignments}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Recorded hours</p><p className="mt-2 text-2xl font-semibold">{snapshot.metrics.laborHours.toFixed(2)}</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.technicians.length ? snapshot.technicians.map(t => <div key={t.id} className="rounded-xl border p-3"><p className="font-medium">{t.displayName}</p><p className="text-xs text-muted-foreground">{t.workerType} · {t.availabilityStatus}</p></div>) : <p className="text-sm text-muted-foreground">No technicians yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Schedule</CardTitle></CardHeader><CardContent className="space-y-2">{calendar.length ? calendar.map(s => <div key={s.id} className="rounded-xl border p-3"><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.technicianName} · {calendarFormatter.format(new Date(s.startsAt))} → {calendarFormatter.format(new Date(s.endsAt))}</p></div>) : <p className="text-sm text-muted-foreground">No schedule entries in this {calendarView}.</p>}</CardContent></Card>
    </div>;
  }

  const canViewFinancials = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Organization operations settings</CardTitle></CardHeader><CardContent>
      <form action={updateOperationsSettingsAction} className="grid gap-3 md:grid-cols-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="defaultTimeZone" defaultValue={settings.defaultTimeZone}><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option><option>America/Phoenix</option><option>Pacific/Honolulu</option></select>
        <input className={field} name="overtimeMultiplier" type="number" step="0.001" min="0" max="10" defaultValue={Number(settings.overtimeMultiplier)} />
        <select className={field} name="payPeriod" defaultValue={settings.payPeriod}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Biweekly</option><option value="SEMIMONTHLY">Semimonthly</option><option value="MONTHLY">Monthly</option></select>
        <button className={button}>Save settings</button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Tenant-scoped defaults. Changes are written to the privileged operations audit trail.</p>
    </CardContent></Card>


    <PageHeader eyebrow="Contractor OS" title="Company Operations" description="Run technicians, scheduling, labor, invoices and expenses from one tenant-safe workspace." breadcrumbs={[{ label: "Command Center", href: "/dashboard" }, { label: "Company Operations" }]} />

    {organizations.length > 1 ? <Card><CardContent className="flex flex-wrap gap-2 p-4">
      {organizations.map((item) => <Link key={item.id} href={`/operations?organizationId=${item.id}`} className={`rounded-xl border px-3 py-2 text-sm ${item.id === organizationId ? "border-primary bg-primary/10" : "border-border"}`}>{item.name}</Link>)}
    </CardContent></Card> : null}

    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      {[
        ["Active technicians", snapshot.metrics.technicianCount],
        ["Upcoming", snapshot.metrics.upcomingAssignments],
        ["Recorded hours", snapshot.metrics.laborHours.toFixed(2)],
        ["Issued invoices", money(snapshot.metrics.invoiced)],
        ["Outstanding", money(snapshot.metrics.outstanding)],
        ["Expenses", money(snapshot.metrics.expenses)],
        ["Utilization", snapshot.metrics.utilizationPercent === null ? "—" : `${snapshot.metrics.utilizationPercent.toFixed(1)}%`],
        ["Overdue invoices", snapshot.metrics.overdueInvoices]
      ].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}
    </div>

    <p className="text-sm text-muted-foreground">Totals cover organization records rather than the capped detail lists. Issued invoices and outstanding exclude drafts. Utilization compares recorded hours with scheduled assignment hours; overdue counts unpaid issued invoices past due. Lists below show recent records.</p>

    <Card><CardHeader><CardTitle>Operational alerts</CardTitle></CardHeader><CardContent className="space-y-2">
      {snapshot.operationalAlerts.length ? snapshot.operationalAlerts.map(alert => <div key={`${alert.alertType}-${alert.entityId}`} className="rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{alert.title}</p><span className="text-xs font-semibold">{alert.severity}</span></div>
        <p className="text-xs text-muted-foreground">{alert.detail}</p>
      </div>) : <p className="text-sm text-muted-foreground">No operational alerts right now.</p>}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Project profitability</CardTitle></CardHeader><CardContent className="space-y-3">
      {snapshot.projectProfitability.length ? snapshot.projectProfitability.map(p => <div key={p.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</p><p className="text-xs text-muted-foreground">Issued revenue excludes draft invoices. Labor uses the historical pay-rate snapshot; overtime is costed at 1.5×.</p></div><div className="text-right"><p className="font-semibold">{money(p.grossProfit)} gross profit</p><p className="text-xs text-muted-foreground">{p.marginPercent === null ? "Margin unavailable until revenue is issued" : `${p.marginPercent.toFixed(1)}% margin`}</p></div></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Revenue</p><p>{money(p.revenue)}</p></div><div><p className="text-xs text-muted-foreground">Labor cost</p><p>{money(p.laborCost)}</p></div><div><p className="text-xs text-muted-foreground">Expenses</p><p>{money(p.expenses)}</p></div><div><p className="text-xs text-muted-foreground">Outstanding</p><p>{money(p.outstanding)}</p></div></div>
      </div>) : <p className="text-sm text-muted-foreground">No project profitability data yet.</p>}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>{org?.name ?? "Organization"} operational controls</CardTitle></CardHeader><CardContent className="grid gap-6 xl:grid-cols-2">
      <form action={createTechnicianAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Technicians / Team</h3><input type="hidden" name="organizationId" value={organizationId} />
        <input className={field} name="displayName" placeholder="Technician name" required />
        <div className="grid gap-3 sm:grid-cols-2"><select className={field} name="workerType"><option value="1099">1099 contractor</option><option value="W2">W-2 employee</option></select><input className={field} name="hourlyPayRate" type="number" min="0" step="0.01" placeholder="Pay rate / hour" /></div>
        <input className={field} name="email" type="email" placeholder="Email (optional)" /><button className={button}>Add technician</button>
      </form>

      <form action={createScheduleAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Scheduling & Availability</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="technicianProfileId" required><option value="">Select technician</option>{snapshot.technicians.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}</select>
        <select className={field} name="projectInstallationId"><option value="">No project (availability / PTO)</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <select className={field} name="workOrderId"><option value="">No work order</option>{snapshot.workOrders.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
        <input className={field} name="title" placeholder="Assignment / PTO / unavailable" required />
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="startsAt" type="datetime-local" required /><input className={field} name="endsAt" type="datetime-local" required /></div><select className={field} name="timeZone" defaultValue={calendarTimeZone}><option value="America/New_York">Eastern · America/New_York</option><option value="America/Chicago">Central · America/Chicago</option><option value="America/Denver">Mountain · America/Denver</option><option value="America/Los_Angeles">Pacific · America/Los_Angeles</option><option value="America/Phoenix">Arizona · America/Phoenix</option><option value="Pacific/Honolulu">Hawaii · Pacific/Honolulu</option></select><p className="text-xs text-muted-foreground">Times are entered in the selected IANA timezone and normalized before conflict checks.</p>
        <select className={field} name="entryType"><option value="ASSIGNMENT">Assignment</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="PTO">PTO</option></select><button className={button}>Schedule</button>
      </form>

      <form action={createTimeEntryAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Time & Pay</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="technicianProfileId" required><option value="">Select technician</option>{snapshot.technicians.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}</select>
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <select className={field} name="workOrderId"><option value="">No work order</option>{snapshot.workOrders.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
        <div className="grid gap-3 sm:grid-cols-3"><input className={field} name="workDate" type="date" required /><input className={field} name="regularHours" type="number" min="0" step="0.25" placeholder="Regular" required /><input className={field} name="overtimeHours" type="number" min="0" step="0.25" placeholder="OT" /></div>
        <p className="text-xs text-muted-foreground">Operational labor control only; this does not replace payroll processing.</p><button className={button}>Add time</button>
      </form>

      <form action={createInvoiceAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Invoices & Payments</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <select className={field} name="workOrderId"><option value="">No work order</option>{snapshot.workOrders.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="invoiceNumber" placeholder="Invoice #" required /><input className={field} name="customerName" placeholder="Customer" required /></div>
        <input className={field} name="dueDate" type="date" /><p className="text-xs text-muted-foreground">Draft starts at $0. Add line items, then apply tax or discount before sending.</p><button className={button}>Create draft invoice</button>
      </form>

      <form action={createExpenseAction} className="space-y-3 rounded-2xl border p-4 xl:col-span-2">
        <h3 className="font-semibold">Expenses & Materials</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <select className={field} name="workOrderId"><option value="">No work order</option>{snapshot.workOrders.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
        <div className="grid gap-3 md:grid-cols-4"><select className={field} name="category"><option>MATERIALS</option><option>TRAVEL</option><option>TOOLS</option><option>SUBCONTRACTOR</option><option>OTHER</option></select><input className={field} name="description" placeholder="Description" required /><input className={field} name="amount" type="number" min="0" step="0.01" placeholder="Amount" required /><input className={field} name="expenseDate" type="date" required /></div>
        <div className="grid gap-3 md:grid-cols-3"><input className={field} name="materialQuantityPurchased" type="number" min="0.001" step="0.001" placeholder="Material qty purchased" /><input className={field} name="materialQuantityUsed" type="number" min="0" step="0.001" placeholder="Material qty used" /><input className={field} name="materialUnit" placeholder="Material unit (ft, ea, box)" /></div>
        <p className="text-xs text-muted-foreground">Material quantity fields are required when category is MATERIALS. Used quantity cannot exceed purchased quantity.</p>
        <label className="flex items-center gap-2 text-sm"><input name="reimbursable" type="checkbox" /> Reimbursable</label><button className={button}>Add expense</button>
      </form>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Schedule calendar · {calendarView === "day" ? "Day" : "Week"}</CardTitle></CardHeader><CardContent className="space-y-4">
      <form method="get" className="grid gap-2 md:grid-cols-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input className={field} type="date" name="date" defaultValue={requestedDate} />
        <select className={field} name="view" defaultValue={calendarView}><option value="day">Day</option><option value="week">Week</option></select>
        <select className={field} name="timeZone" defaultValue={calendarTimeZone}><option value="America/New_York">Eastern</option><option value="America/Chicago">Central</option><option value="America/Denver">Mountain</option><option value="America/Los_Angeles">Pacific</option><option value="America/Phoenix">Arizona</option><option value="Pacific/Honolulu">Hawaii</option></select>
        <button className={button}>View calendar</button>
      </form>
      <p className="text-xs text-muted-foreground">Display timezone: {calendarTimeZone}. Assignments, PTO and unavailable periods share the existing conflict protection; AVAILABLE remains advisory.</p>
      <div className="space-y-2">{calendar.length ? calendar.map(s => <div key={s.id} className="grid gap-1 rounded-xl border p-3 md:grid-cols-[1fr_auto]"><div><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.technicianName} · {s.entryType}{s.workOrderId ? ` · WO ${s.workOrderId}` : ""}</p></div><p className="text-sm md:text-right">{calendarFormatter.format(new Date(s.startsAt))}<br />→ {calendarFormatter.format(new Date(s.endsAt))}</p></div>) : <p className="text-sm text-muted-foreground">No schedule entries in this {calendarView}.</p>}</div>
    </CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="space-y-3">{snapshot.technicians.length ? snapshot.technicians.map(t => <div key={t.id} className="rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{t.displayName}</p><p className="text-xs text-muted-foreground">{t.workerType} · {t.employmentStatus} · {t.availabilityStatus}</p></div><span className="text-sm">{t.hourlyPayRate !== null ? money(Number(t.hourlyPayRate)) + "/hr" : "Rate restricted/not set"}</span></div><form action={updateTechnicianProfileAction} className="mt-3 grid gap-2 md:grid-cols-2"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="technicianProfileId" value={t.id} /><input className={field} name="skills" defaultValue={technicianSkills(t.skillsJson)} placeholder="Skills: CAT6, CCTV, Ubiquiti" /><input className={field} name="certifications" defaultValue={technicianCertifications(t.certificationsJson)} placeholder="Certifications: CCNA, Network+" /><input className={field} name="certificationExpiresOn" type="date" aria-label="Certification expiration" /><select className={field} name="employmentStatus" defaultValue={t.employmentStatus}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><select className={field} name="availabilityStatus" defaultValue={t.availabilityStatus}><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="PTO">PTO</option></select><button className={button} type="submit">Update technician</button></form><form className="mt-3 grid gap-2 md:grid-cols-2" action={`/api/operations/technicians/${t.id}/documents`} method="post" encType="multipart/form-data"><input type="hidden" name="organizationId" value={organizationId} /><input className={field} name="title" placeholder="Document title" /><select className={field} name="documentType"><option value="CERTIFICATION">Certification</option><option value="LICENSE">License</option><option value="INSURANCE">Insurance</option><option value="OTHER">Other</option></select><input className={field} name="expiresOn" type="date" aria-label="Document expiration" /><input className={field} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required /><button className={button} type="submit">Upload private document</button></form></div>) : <p className="text-sm text-muted-foreground">No technicians yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Upcoming schedule</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.schedule.length ? snapshot.schedule.map(s => <div key={s.id} className="rounded-xl border p-3"><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.technicianName} · {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No upcoming assignments.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Pay period export</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Export approved operational time and historical labor-cost snapshots. This CSV is an operational handoff and does not process payroll.</p>
        <form action="/api/operations/pay-period/export" method="get" className="grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input className={field} name="start" type="date" required />
          <input className={field} name="end" type="date" required />
          <button className={button}>Export approved time CSV</button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Time approvals</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.timeEntries.length ? snapshot.timeEntries.map(t => <div key={t.id} className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{t.technicianName}</p><p className="text-xs text-muted-foreground">{date(t.workDate)} · {Number(t.regularHours)} regular + {Number(t.overtimeHours)} OT · {t.status}</p></div></div>{t.status === "DRAFT" ? <form action={submitTimeEntryAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="timeEntryId" value={t.id} /><button className={button}>Submit time</button></form> : t.status === "SUBMITTED" ? <form action={approveTimeEntryAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="timeEntryId" value={t.id} /><button className={button}>Approve time</button></form> : null}</div>) : <p className="text-sm text-muted-foreground">No time entries yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.invoices.length ? snapshot.invoices.map(i => <div key={i.id} className="space-y-3 rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{i.invoiceNumber} · {i.customerName}</p><p className="text-xs text-muted-foreground">{i.status} · due {date(i.dueDate)}</p><Link className="text-xs underline" href={`/operations/invoices/${i.id}?organizationId=${organizationId}`}>Client invoice</Link></div><span className="text-sm">{money(Number(i.totalAmount) - Number(i.paidAmount))} due</span></div>{i.status === "DRAFT" ? <div className="space-y-2"><form action={addInvoiceLineAction} className="grid gap-2 sm:grid-cols-5"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><select className={field} name="lineType"><option>SERVICE</option><option>LABOR</option><option>MATERIAL</option><option>TRAVEL</option><option>OTHER</option></select><input className={field} name="description" placeholder="Line description" required /><input className={field} name="quantity" type="number" min="0.001" step="0.001" placeholder="Qty" required /><input className={field} name="unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" required /><button className={button}>Add line</button></form><div className="space-y-1">{snapshot.invoiceLines.filter(l => l.invoiceId === i.id).map(l => <p key={l.id} className="text-xs text-muted-foreground">{l.lineType} · {l.description} · {Number(l.quantity)} × {money(Number(l.unitPrice))} = {money(Number(l.amount))}</p>)}</div><form action={updateInvoiceAdjustmentsAction} className="grid gap-2 sm:grid-cols-3"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><input className={field} name="taxAmount" type="number" min="0" step="0.01" placeholder="Tax amount" /><input className={field} name="discountAmount" type="number" min="0" step="0.01" placeholder="Discount amount" /><button className={button}>Apply tax / discount</button></form><form action={sendInvoiceAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><button className={button}>Mark sent</button></form></div> : i.status !== "PAID" ? <form action={recordInvoicePaymentAction} className="grid gap-2 sm:grid-cols-4"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><input className={field} name="amount" type="number" min="0.01" step="0.01" placeholder="Payment" required /><input className={field} name="paidAt" type="datetime-local" required /><input className={field} name="method" placeholder="Method" /><button className={button}>Record payment</button></form> : null}</div>) : <p className="text-sm text-muted-foreground">No invoices yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent expenses</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.expenses.length ? snapshot.expenses.map(e => <div key={e.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{e.category} · {date(e.expenseDate)}{e.category === "MATERIALS" && e.materialQuantityPurchased !== null && e.materialQuantityUsed !== null ? ` · ${Number(e.materialQuantityUsed)} / ${Number(e.materialQuantityPurchased)} ${e.materialUnit ?? ""} used · ${Number(e.materialQuantityPurchased) - Number(e.materialQuantityUsed)} remaining` : ""}</p></div><span className="text-sm">{money(Number(e.amount))}</span></div>) : <p className="text-sm text-muted-foreground">No expenses yet.</p>}</CardContent></Card>
    </div>
  </div>;
}