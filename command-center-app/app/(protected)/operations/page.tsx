import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getOperationsSnapshot } from "@/lib/company-operations/repository";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { routeAccess } from "@/lib/rbac";

import { addInvoiceLineAction, approveTimeEntryAction, createExpenseAction, createInvoiceAction, createScheduleAction, createTechnicianAction, createTimeEntryAction, recordInvoicePaymentAction, sendInvoiceAction, submitTimeEntryAction, updateInvoiceAdjustmentsAction } from "./actions";

type Props = { searchParams?: Record<string, string | string[] | undefined> };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value) : "—";
const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm";
const button = "h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground";

export default async function OperationsPage({ searchParams = {} }: Props) {
  const user = await requireRoles(routeAccess.companyOperations);
  const organizations = await getOrganizationOptions(user);
  const requested = typeof searchParams.organizationId === "string" ? searchParams.organizationId : undefined;
  const organizationId = user.organizationId || requested || organizations[0]?.id;

  if (!organizationId) return <PageHeader eyebrow="Company Operations" title="No organization available" description="Create an organization before using the operations workspace." />;

  const snapshot = await getOperationsSnapshot({ id: user.id, role: user.role, organizationId: user.organizationId }, organizationId);
  const org = organizations.find((item) => item.id === organizationId);

  return <div className="space-y-6">
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
        <input className={field} name="title" placeholder="Assignment / PTO / unavailable" required />
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="startsAt" type="datetime-local" required /><input className={field} name="endsAt" type="datetime-local" required /></div>
        <select className={field} name="entryType"><option value="ASSIGNMENT">Assignment</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="PTO">PTO</option></select><button className={button}>Schedule</button>
      </form>

      <form action={createTimeEntryAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Time & Pay</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="technicianProfileId" required><option value="">Select technician</option>{snapshot.technicians.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}</select>
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <div className="grid gap-3 sm:grid-cols-3"><input className={field} name="workDate" type="date" required /><input className={field} name="regularHours" type="number" min="0" step="0.25" placeholder="Regular" required /><input className={field} name="overtimeHours" type="number" min="0" step="0.25" placeholder="OT" /></div>
        <p className="text-xs text-muted-foreground">Operational labor control only; this does not replace payroll processing.</p><button className={button}>Add time</button>
      </form>

      <form action={createInvoiceAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Invoices & Payments</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="invoiceNumber" placeholder="Invoice #" required /><input className={field} name="customerName" placeholder="Customer" required /></div>
        <input className={field} name="dueDate" type="date" /><p className="text-xs text-muted-foreground">Draft starts at $0. Add line items, then apply tax or discount before sending.</p><button className={button}>Create draft invoice</button>
      </form>

      <form action={createExpenseAction} className="space-y-3 rounded-2xl border p-4 xl:col-span-2">
        <h3 className="font-semibold">Expenses & Materials</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="projectInstallationId"><option value="">General / no project</option>{snapshot.projects.map(p => <option key={p.id} value={p.id}>{p.projectCode ? `${p.projectCode} · ` : ""}{p.name}</option>)}</select>
        <div className="grid gap-3 md:grid-cols-4"><select className={field} name="category"><option>MATERIALS</option><option>TRAVEL</option><option>TOOLS</option><option>SUBCONTRACTOR</option><option>OTHER</option></select><input className={field} name="description" placeholder="Description" required /><input className={field} name="amount" type="number" min="0" step="0.01" placeholder="Amount" required /><input className={field} name="expenseDate" type="date" required /></div>
        <div className="grid gap-3 md:grid-cols-3"><input className={field} name="materialQuantityPurchased" type="number" min="0.001" step="0.001" placeholder="Material qty purchased" /><input className={field} name="materialQuantityUsed" type="number" min="0" step="0.001" placeholder="Material qty used" /><input className={field} name="materialUnit" placeholder="Material unit (ft, ea, box)" /></div>
        <p className="text-xs text-muted-foreground">Material quantity fields are required when category is MATERIALS. Used quantity cannot exceed purchased quantity.</p>
        <label className="flex items-center gap-2 text-sm"><input name="reimbursable" type="checkbox" /> Reimbursable</label><button className={button}>Add expense</button>
      </form>
    </CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.technicians.length ? snapshot.technicians.map(t => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{t.displayName}</p><p className="text-xs text-muted-foreground">{t.workerType} · {t.availabilityStatus}</p></div><span className="text-sm">{t.hourlyPayRate !== null ? money(Number(t.hourlyPayRate)) + "/hr" : "Rate not set"}</span></div>) : <p className="text-sm text-muted-foreground">No technicians yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Upcoming schedule</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.schedule.length ? snapshot.schedule.map(s => <div key={s.id} className="rounded-xl border p-3"><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.technicianName} · {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No upcoming assignments.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Time approvals</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.timeEntries.length ? snapshot.timeEntries.map(t => <div key={t.id} className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{t.technicianName}</p><p className="text-xs text-muted-foreground">{date(t.workDate)} · {Number(t.regularHours)} regular + {Number(t.overtimeHours)} OT · {t.status}</p></div></div>{t.status === "DRAFT" ? <form action={submitTimeEntryAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="timeEntryId" value={t.id} /><button className={button}>Submit time</button></form> : t.status === "SUBMITTED" ? <form action={approveTimeEntryAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="timeEntryId" value={t.id} /><button className={button}>Approve time</button></form> : null}</div>) : <p className="text-sm text-muted-foreground">No time entries yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.invoices.length ? snapshot.invoices.map(i => <div key={i.id} className="space-y-3 rounded-xl border p-3"><div className="flex items-center justify-between"><div><p className="font-medium">{i.invoiceNumber} · {i.customerName}</p><p className="text-xs text-muted-foreground">{i.status} · due {date(i.dueDate)}</p><Link className="text-xs underline" href={`/operations/invoices/${i.id}?organizationId=${organizationId}`}>Client invoice</Link></div><span className="text-sm">{money(Number(i.totalAmount) - Number(i.paidAmount))} due</span></div>{i.status === "DRAFT" ? <div className="space-y-2"><form action={addInvoiceLineAction} className="grid gap-2 sm:grid-cols-5"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><select className={field} name="lineType"><option>SERVICE</option><option>LABOR</option><option>MATERIAL</option><option>TRAVEL</option><option>OTHER</option></select><input className={field} name="description" placeholder="Line description" required /><input className={field} name="quantity" type="number" min="0.001" step="0.001" placeholder="Qty" required /><input className={field} name="unitPrice" type="number" min="0" step="0.01" placeholder="Unit price" required /><button className={button}>Add line</button></form><div className="space-y-1">{snapshot.invoiceLines.filter(l => l.invoiceId === i.id).map(l => <p key={l.id} className="text-xs text-muted-foreground">{l.lineType} · {l.description} · {Number(l.quantity)} × {money(Number(l.unitPrice))} = {money(Number(l.amount))}</p>)}</div><form action={updateInvoiceAdjustmentsAction} className="grid gap-2 sm:grid-cols-3"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><input className={field} name="taxAmount" type="number" min="0" step="0.01" placeholder="Tax amount" /><input className={field} name="discountAmount" type="number" min="0" step="0.01" placeholder="Discount amount" /><button className={button}>Apply tax / discount</button></form><form action={sendInvoiceAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><button className={button}>Mark sent</button></form></div> : i.status !== "PAID" ? <form action={recordInvoicePaymentAction} className="grid gap-2 sm:grid-cols-4"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="invoiceId" value={i.id} /><input className={field} name="amount" type="number" min="0.01" step="0.01" placeholder="Payment" required /><input className={field} name="paidAt" type="datetime-local" required /><input className={field} name="method" placeholder="Method" /><button className={button}>Record payment</button></form> : null}</div>) : <p className="text-sm text-muted-foreground">No invoices yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent expenses</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.expenses.length ? snapshot.expenses.map(e => <div key={e.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{e.category} · {date(e.expenseDate)}{e.category === "MATERIALS" && e.materialQuantityPurchased !== null && e.materialQuantityUsed !== null ? ` · ${Number(e.materialQuantityUsed)} / ${Number(e.materialQuantityPurchased)} ${e.materialUnit ?? ""} used · ${Number(e.materialQuantityPurchased) - Number(e.materialQuantityUsed)} remaining` : ""}</p></div><span className="text-sm">{money(Number(e.amount))}</span></div>) : <p className="text-sm text-muted-foreground">No expenses yet.</p>}</CardContent></Card>
    </div>
  </div>;
}