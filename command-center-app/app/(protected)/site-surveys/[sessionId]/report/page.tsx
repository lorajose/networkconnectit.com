import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { requireSiteSurveyPageAccess } from "@/lib/contractor-os/field-technician-access";
import { getSurveySessionWorkspace } from "@/lib/contractor-os/site-survey-repository";
import type { SurveyChecklistSection } from "@/lib/contractor-os/site-survey";

type Props = { params: { sessionId: string }; searchParams?: { organizationId?: string } };

export default async function SiteSurveyReportPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const organizationId =
    user.role === "CLIENT_ADMIN" || user.role === "VIEWER"
      ? user.organizationId ?? ""
      : searchParams?.organizationId ?? user.organizationId ?? "";
  if (!organizationId) notFound();

  await requireSiteSurveyPageAccess(
    { id: user.id, role: user.role, organizationId: user.organizationId },
    { organizationId, sessionId: params.sessionId },
  );
  const workspace = await getSurveySessionWorkspace(
    { role: user.role, organizationId: user.organizationId },
    params.sessionId,
    organizationId,
  );
  if (!workspace) notFound();

  const checklist = JSON.parse(workspace.session.checklistSnapshotJson) as SurveyChecklistSection[];
  const responses = new Map(workspace.responses.map((response) => [response.itemKey, response]));

  return (
    <main className="mx-auto max-w-5xl space-y-8 bg-white p-6 text-black print:p-0">
      <header className="border-b pb-5">
        <p className="text-sm font-semibold uppercase tracking-widest">NetworkConnectIT Contractor OS</p>
        <h1 className="mt-2 text-3xl font-bold">Site Survey Report</h1>
        <p className="mt-2">{workspace.assignment.title}</p>
        <p className="text-sm">{workspace.assignment.projectName} · {workspace.assignment.siteName}</p>
        <p className="mt-2 text-xs">Status: {workspace.session.status} · Started {workspace.session.startedAt.toLocaleString()}</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">Survey summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="border p-3"><strong>{workspace.areas.length}</strong><br/>Areas / rooms</div>
          <div className="border p-3"><strong>{workspace.points.length}</strong><br/>Survey points</div>
          <div className="border p-3"><strong>{workspace.measurements.length}</strong><br/>Measurements</div>
          <div className="border p-3"><strong>{workspace.assets.length}</strong><br/>Photos</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Checklist</h2>
        <div className="mt-3 space-y-5">
          {checklist.map((section) => (
            <div key={section.key}>
              <h3 className="font-semibold">{section.title}</h3>
              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {section.items.map((item) => {
                    const response = responses.get(item.key);
                    return (
                      <tr key={item.key} className="border-b">
                        <td className="py-2 pr-3">{item.label}</td>
                        <td className="py-2 pr-3 font-medium">{response?.status ?? "PENDING"}</td>
                        <td className="py-2">{response?.notes ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Field observations</h2>
        <div className="mt-3 space-y-2 text-sm">
          {workspace.points.map((point) => (
            <div key={point.id} className="border p-3">
              <strong>{point.label || point.pointType}</strong> · {point.discipline} · {point.lifecycle}
              {point.notes ? <p className="mt-1">{point.notes}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Measurements</h2>
        <div className="mt-3 space-y-2 text-sm">
          {workspace.measurements.map((measurement) => (
            <div key={measurement.id} className="border p-3">
              <strong>{measurement.label}</strong>: {Number(measurement.value)} {measurement.unit}
              {measurement.notes ? <span> · {measurement.notes}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Photo evidence</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
          {workspace.assets.map((asset) => (
            <figure key={asset.id} className="break-inside-avoid border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/site-surveys/assets/${asset.id}`} alt={asset.originalName} className="h-40 w-full object-cover" />
              <figcaption className="mt-1 break-all text-xs">{asset.originalName}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="border-t pt-4 text-xs">
        Generated from tenant-scoped survey data. Use the browser Print / Save as PDF command for a customer-ready copy.
      </footer>
    </main>
  );
}
