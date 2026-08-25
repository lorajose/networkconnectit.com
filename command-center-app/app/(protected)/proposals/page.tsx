import { requireRoles } from "@/lib/auth";
import { calculateEstimate } from "@/lib/contractor-os/cost-engine";
import { buildProposalDocument } from "@/lib/contractor-os/proposal";
import { routeAccess } from "@/lib/rbac";
import { ProposalActions } from "./proposal-actions";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function ProposalsPage() {
  await requireRoles(routeAccess.proposals);

  const totals = calculateEstimate({
    markupPercent: 35,
    taxPercent: 8.625,
    laborBurdenPercent: 18,
    contingencyPercent: 5,
    lines: [
      { type: "MATERIAL", description: "4K IP Cameras", quantity: 16, unitCost: 145, taxable: true, unit: "ea" },
      { type: "MATERIAL", description: "32-channel NVR", quantity: 1, unitCost: 950, taxable: true, unit: "ea" },
      { type: "MATERIAL", description: "Cat6 cable", quantity: 2640, unitCost: 0.22, taxable: true, unit: "ft" },
      { type: "LABOR", description: "Installation & commissioning", quantity: 48, unitCost: 55, taxable: false, unit: "hr" },
      { type: "TRAVEL", description: "Mobilization", quantity: 1, unitCost: 125, taxable: false, unit: "job" },
      { type: "CONSUMABLE", description: "Labels, connectors, anchors & misc.", quantity: 1, unitCost: 180, taxable: true, unit: "job" },
    ],
  });

  const proposal = buildProposalDocument({
    proposalNumber: "NCI-P-1001",
    title: "16-Camera IP Video Surveillance Upgrade",
    branding: {
      companyName: "NetworkConnectIT LLC",
      phone: "(000) 000-0000",
      email: "sales@networkconnectit.com",
      website: "networkconnectit.com",
    },
    customer: {
      companyName: "Smith Dental Office",
      contactName: "Demo Customer",
      siteAddress: "Long Island, NY",
    },
    scopeSummary: "Provide a complete IP video surveillance upgrade including sixteen 4K cameras, recording, structured cabling, labeling, installation, configuration, testing, commissioning, and turnover documentation.",
    lines: [
      { description: "16-camera surveillance system — materials, installation, configuration & commissioning", quantity: 1, unit: "project", unitPrice: totals.sellSubtotal, amount: totals.sellSubtotal },
    ],
    totals,
    assumptions: [
      "Existing pathways are usable unless concealed conditions are discovered.",
      "Customer provides reasonable access to all installation areas during scheduled work.",
      "Final camera views will be confirmed during commissioning.",
    ],
    exclusions: [
      "Electrical branch-circuit work, patch/paint, permits, lifts, and after-hours work unless specifically listed.",
      "Recurring cloud, cellular, licensing, or monitoring fees unless specifically listed.",
    ],
    paymentTerms: "50% deposit to schedule; 40% at substantial installation completion; 10% at final turnover.",
    warranty: "One-year workmanship warranty. Manufacturer warranties apply to supplied equipment.",
    validForDays: 30,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-sky-600">Contractor OS</p>
          <h1 className="text-3xl font-bold tracking-tight">Proposal Builder</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Turn protected estimate economics into a client-ready sales document without exposing internal cost or margin.</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Demo proposal</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr] print:block">
        <aside className="space-y-4 print:hidden">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Commercial controls</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Info label="Proposal" value={proposal.proposalNumber} />
              <Info label="Customer" value={proposal.customer.companyName} />
              <Info label="Valid through" value={new Date(proposal.validUntilIso).toLocaleDateString("en-US")} />
              <Info label="Customer total" value={currency.format(proposal.customerTotal)} />
            </div>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            <h3 className="font-semibold">Margin stays private</h3>
            <p className="mt-2">The proposal receives the selling price and tax only. Direct cost, burden, contingency and gross margin remain internal to Contractor OS.</p>
          </section>
          <ProposalActions
            proposalNumber={proposal.proposalNumber}
            customerName={proposal.customer.companyName}
            customerTotal={proposal.customerTotal}
            validUntilIso={proposal.validUntilIso}
          />
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
            <h3 className="font-semibold">Commercial handoff</h3>
            <p className="mt-2">PDF export now uses the browser print pipeline so the proposal can be saved or printed without exposing Contractor OS controls. Approval capture is visible in this increment; durable database persistence is the next production step.</p>
          </section>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-slate-200 bg-slate-950 px-8 py-7 text-white print:bg-white print:text-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="text-2xl font-bold">{proposal.branding.companyName}</div>
                <div className="mt-2 text-sm text-slate-300 print:text-slate-600">{proposal.branding.website} · {proposal.branding.email}</div>
              </div>
              <div className="text-right text-sm text-slate-300 print:text-slate-600">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-300 print:text-slate-500">Proposal</div>
                <div className="mt-1 text-lg font-semibold text-white print:text-slate-950">{proposal.proposalNumber}</div>
              </div>
            </div>
          </header>

          <div className="space-y-7 p-8">
            <section className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prepared for</p>
                <h2 className="mt-2 text-xl font-semibold">{proposal.customer.companyName}</h2>
                <p className="mt-1 text-sm text-slate-600">{proposal.customer.contactName}</p>
                <p className="text-sm text-slate-600">{proposal.customer.siteAddress}</p>
              </div>
              <div className="md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Investment</p>
                <div className="mt-2 text-3xl font-bold text-slate-950">{currency.format(proposal.customerTotal)}</div>
                <p className="mt-1 text-sm text-slate-500">Includes applicable sales tax</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold">{proposal.title}</h2>
              <p className="mt-3 leading-7 text-slate-700">{proposal.scopeSummary}</p>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Scope</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
                <tbody>{proposal.lines.map((line) => <tr key={line.description}><td className="px-4 py-4 font-medium">{line.description}</td><td className="px-4 py-4 text-right font-semibold">{currency.format(line.amount)}</td></tr>)}</tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr><td className="px-4 py-2 text-right text-slate-500">Subtotal</td><td className="px-4 py-2 text-right">{currency.format(proposal.customerSubtotal)}</td></tr>
                  <tr><td className="px-4 py-2 text-right text-slate-500">Sales tax</td><td className="px-4 py-2 text-right">{currency.format(proposal.customerTax)}</td></tr>
                  <tr><td className="px-4 py-3 text-right font-semibold">Total</td><td className="px-4 py-3 text-right text-lg font-bold">{currency.format(proposal.customerTotal)}</td></tr>
                </tfoot>
              </table>
            </section>

            <TwoColumnList title="Assumptions" items={proposal.assumptions ?? []} secondTitle="Exclusions" secondItems={proposal.exclusions ?? []} />

            <section className="grid gap-4 rounded-xl bg-slate-50 p-5 md:grid-cols-2">
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment terms</div><p className="mt-2 text-sm leading-6 text-slate-700">{proposal.paymentTerms}</p></div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Warranty</div><p className="mt-2 text-sm leading-6 text-slate-700">{proposal.warranty}</p></div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>;
}

function TwoColumnList({ title, items, secondTitle, secondItems }: { title: string; items: string[]; secondTitle: string; secondItems: string[] }) {
  return <section className="grid gap-6 md:grid-cols-2"><div><h3 className="font-semibold">{title}</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><h3 className="font-semibold">{secondTitle}</h3><ul className="mt-3 space-y-2 text-sm text-slate-700">{secondItems.map((item) => <li key={item}>• {item}</li>)}</ul></div></section>;
}
