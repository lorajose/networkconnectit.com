import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSiteSurveyPageAccess } from "@/lib/contractor-os/field-technician-access";
import {
  getFinalAcceptanceAndCloseout,
  getWorkOrderBySurvey,
  listPunchListItems,
  listWorkOrderEvidence,
} from "@/lib/contractor-os/project-approval-work-order";

type Props = { params: { sessionId: string }; searchParams?: { organizationId?: string } };

export default async function CloseoutReportPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const organizationId =
    user.role === "CLIENT_ADMIN" || user.role === "VIEWER"
      ? user.organizationId ?? ""
      : searchParams?.organizationId ?? user.organizationId ?? "";
  if (!organizationId) notFound();

  const actor = { id: user.id, role: user.role, organizationId: user.organizationId };
  await requireSiteSurveyPageAccess(actor, { organizationId, sessionId: params.sessionId });

  const workOrder = await getWorkOrderBySurvey(actor, { organizationId, sessionId: params.sessionId });
  if (!workOrder) notFound();

  const [organization, evidence, punch, closeout] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, logoUrl: true, brandPrimaryColor: true, brandAccentColor: true, brandTagline: true },
    }),
    listWorkOrderEvidence(actor, { organizationId, workOrderId: workOrder.id, sessionId: params.sessionId }),
    listPunchListItems({ role: user.role, organizationId: user.organizationId }, { organizationId, workOrderId: workOrder.id }),
    getFinalAcceptanceAndCloseout({ role: user.role, organizationId: user.organizationId }, { organizationId, workOrderId: workOrder.id }),
  ]);

  const company = organization?.name ?? "NetworkConnectIT";
  const cableRuns = workOrder.items.filter((item) => item.runIdentifier);
  const evidenceCount = (itemId: string) => evidence.filter((file) => file.workOrderItemId === itemId).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 bg-white p-8 text-slate-950 print:max-w-none print:p-0">
      <header className="border-b pb-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{company} · Project Closeout</p>
            <h1 className="mt-2 text-3xl font-semibold">{workOrder.title}</h1>
            {organization?.brandTagline ? <p className="mt-1 text-sm text-slate-500">{organization.brandTagline}</p> : null}
          </div>
          {organization?.logoUrl ? <img src={organization.logoUrl} alt={company + " logo"} className="max-h-16 max-w-48 object-contain" /> : null}
        </div>
        {organization?.brandPrimaryColor || organization?.brandAccentColor ? (
          <div className="mt-4 flex gap-2" aria-label="Organization brand colors">
            {organization.brandPrimaryColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandPrimaryColor }} /> : null}
            {organization.brandAccentColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandAccentColor }} /> : null}
          </div>
        ) : null}
      </header>

      <section>
        <h2 className="text-xl font-semibold">Closeout summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          <div className="border p-3"><strong>{cableRuns.length}</strong><br />Cable runs</div>
          <div className="border p-3"><strong>{cableRuns.filter((run) => run.testStatus === "PASS").length}</strong><br />PASS</div>
          <div className="border p-3"><strong>{closeout.gate.openPunch}</strong><br />Open punch</div>
          <div className="border p-3"><strong>{evidence.length}</strong><br />Evidence files</div>
          <div className="border p-3"><strong>{closeout.acceptance?.status ?? "PENDING"}</strong><br />Final acceptance</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Final cable schedule</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2 text-left">Run</th><th className="p-2">Scope</th><th className="p-2">Floor</th><th className="p-2">From → To</th><th className="p-2">Cable</th><th className="p-2">Length</th><th className="p-2">Wiremap</th><th className="p-2">1Gbps</th><th className="p-2">Overall</th><th className="p-2">Evidence</th><th className="p-2">Acceptance</th></tr></thead>
            <tbody>{cableRuns.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="p-2 font-medium">{run.runIdentifier}</td><td className="p-2 text-center">{run.scopeType}</td><td className="p-2 text-center">{run.floorLevel ?? "—"}</td>
                <td className="p-2">{run.fromLocation ?? "—"} → {run.toLocation ?? "—"}</td><td className="p-2 text-center">{run.cableType ?? "—"}</td>
                <td className="p-2 text-center">{run.measuredLength == null ? "—" : String(run.measuredLength) + " " + (run.lengthUnit ?? "")}</td>
                <td className="p-2 text-center">{run.wiremapStatus ?? "—"}</td><td className="p-2 text-center">{run.gigabitLinkStatus ?? "—"}</td>
                <td className="p-2 text-center">{run.testStatus ?? "—"}</td><td className="p-2 text-center">{evidenceCount(run.id)}</td><td className="p-2 text-center">{run.acceptanceStatus ?? "PENDING"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Punch list</h2>
        {punch.length ? <div className="mt-3 space-y-2">{punch.map((item) => <div key={item.id} className="break-inside-avoid border p-3 text-sm"><strong>{item.title}</strong> · {item.severity} · {item.status}{item.description ? <p>{item.description}</p> : null}{item.resolutionNote ? <p>Resolution: {item.resolutionNote}</p> : null}</div>)}</div> : <p className="mt-2 text-sm">No punch-list items.</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Test & photo evidence index</h2>
        <div className="mt-3 space-y-2 text-sm">{evidence.map((file) => <div key={file.id} className="border p-3"><strong>{file.evidenceType} · {file.originalName}</strong>{file.caption ? <span> · {file.caption}</span> : null}<span className="ml-2 text-slate-500">Run {cableRuns.find((run) => run.id === file.workOrderItemId)?.runIdentifier ?? "work item"}</span></div>)}</div>
      </section>

      <section className="grid gap-6 border-t pt-5 md:grid-cols-2">
        <div><h2 className="font-semibold">Technician / contractor sign-off</h2><div className="mt-10 border-b" /><p className="mt-1 text-xs">Name / signature / date</p></div>
        <div><h2 className="font-semibold">Customer acceptance</h2><p className="mt-2 text-sm">{closeout.acceptance?.customerName ?? "Pending customer acceptance"}{closeout.acceptance?.acceptedAt ? " · " + closeout.acceptance.acceptedAt.toLocaleDateString() : ""}</p><div className="mt-6 border-b" /><p className="mt-1 text-xs">Authorized name / signature / date</p></div>
      </section>

      <footer className="border-t pt-4 text-xs text-slate-500">Client-safe closeout view generated from tenant-scoped work-order data. Commercial pricing is intentionally excluded. Print / Save as PDF for delivery.</footer>
    </main>
  );
}
