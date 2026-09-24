import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getOperationsSnapshot } from "@/lib/company-operations/repository";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { routeAccess } from "@/lib/rbac";

import { createExpenseAction, createInvoiceAction, createScheduleAction, createTechnicianAction, createTimeEntryAction } from "./actions";

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

    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {[
        ["Active technicians", snapshot.metrics.technicianCount],
        ["Upcoming", snapshot.metrics.upcomingAssignments],
        ["Recorded hours", snapshot.metrics.laborHours.toFixed(2)],
        ["Issued invoices", money(snapshot.metrics.invoiced)],
        ["Outstanding", money(snapshot.metrics.outstanding)],
        ["Expenses", money(snapshot.metrics.expenses)]
      ].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}
    </div>

    <p className="text-sm text-muted-foreground">Totals cover all records for this organization. Issued invoices and outstanding balances exclude drafts; recorded hours include draft, submitted and approved entries. Lists below show recent records.</p>

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
        <input className={field} name="title" placeholder="Assignment / PTO / unavailable" required />
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="startsAt" type="datetime-local" required /><input className={field} name="endsAt" type="datetime-local" required /></div>
        <select className={field} name="entryType"><option value="ASSIGNMENT">Assignment</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="PTO">PTO</option></select><button className={button}>Schedule</button>
      </form>

      <form action={createTimeEntryAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Time & Pay</h3><input type="hidden" name="organizationId" value={organizationId} />
        <select className={field} name="technicianProfileId" required><option value="">Select technician</option>{snapshot.technicians.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}</select>
        <div className="grid gap-3 sm:grid-cols-3"><input className={field} name="workDate" type="date" required /><input className={field} name="regularHours" type="number" min="0" step="0.25" placeholder="Regular" required /><input className={field} name="overtimeHours" type="number" min="0" step="0.25" placeholder="OT" /></div>
        <p className="text-xs text-muted-foreground">Operational labor control only; this does not replace payroll processing.</p><button className={button}>Add time</button>
      </form>

      <form action={createInvoiceAction} className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-semibold">Invoices & Payments</h3><input type="hidden" name="organizationId" value={organizationId} />
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="invoiceNumber" placeholder="Invoice #" required /><input className={field} name="customerName" placeholder="Customer" required /></div>
        <div className="grid gap-3 sm:grid-cols-2"><input className={field} name="totalAmount" type="number" min="0" step="0.01" placeholder="Total" required /><input className={field} name="dueDate" type="date" /></div><button className={button}>Create draft invoice</button>
      </form>

      <form action={createExpenseAction} className="space-y-3 rounded-2xl border p-4 xl:col-span-2">
        <h3 className="font-semibold">Expenses & Materials</h3><input type="hidden" name="organizationId" value={organizationId} />
        <div className="grid gap-3 md:grid-cols-4"><select className={field} name="category"><option>MATERIALS</option><option>TRAVEL</option><option>TOOLS</option><option>SUBCONTRACTOR</option><option>OTHER</option></select><input className={field} name="description" placeholder="Description" required /><input className={field} name="amount" type="number" min="0" step="0.01" placeholder="Amount" required /><input className={field} name="expenseDate" type="date" required /></div>
        <label className="flex items-center gap-2 text-sm"><input name="reimbursable" type="checkbox" /> Reimbursable</label><button className={button}>Add expense</button>
      </form>
    </CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.technicians.length ? snapshot.technicians.map(t => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{t.displayName}</p><p className="text-xs text-muted-foreground">{t.workerType} · {t.availabilityStatus}</p></div><span className="text-sm">{t.hourlyPayRate !== null ? money(Number(t.hourlyPayRate)) + "/hr" : "Rate not set"}</span></div>) : <p className="text-sm text-muted-foreground">No technicians yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Upcoming schedule</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.schedule.length ? snapshot.schedule.map(s => <div key={s.id} className="rounded-xl border p-3"><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.technicianName} · {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No upcoming assignments.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.invoices.length ? snapshot.invoices.map(i => <div key={i.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{i.invoiceNumber} · {i.customerName}</p><p className="text-xs text-muted-foreground">{i.status} · due {date(i.dueDate)}</p></div><span className="text-sm">{money(Number(i.totalAmount) - Number(i.paidAmount))} due</span></div>) : <p className="text-sm text-muted-foreground">No invoices yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent expenses</CardTitle></CardHeader><CardContent className="space-y-2">{snapshot.expenses.length ? snapshot.expenses.map(e => <div key={e.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{e.category} · {date(e.expenseDate)}</p></div><span className="text-sm">{money(Number(e.amount))}</span></div>) : <p className="text-sm text-muted-foreground">No expenses yet.</p>}</CardContent></Card>
    </div>
  </div>;
}