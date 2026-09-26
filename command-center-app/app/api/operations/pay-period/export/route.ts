import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { getPayPeriodSummary } from "@/lib/company-operations/repository";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const csv = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const auth = await requireApiRoles(routeAccess.companyOperations);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status, headers: { "Cache-Control": "no-store" } });

  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start")?.trim() || "";
    const endDate = url.searchParams.get("end")?.trim() || "";
    const organizationId = auth.user.organizationId?.trim() || url.searchParams.get("organizationId")?.trim() || undefined;
    const summary = await getPayPeriodSummary(
      { id: auth.user.id, role: auth.user.role, organizationId: auth.user.organizationId ?? null },
      { organizationId, startDate, endDate }
    );

    const header = ["Technician","Worker Type","Work Date","Project ID","Work Order ID","Regular Hours","OT Hours","Rate Snapshot","Regular Cost","OT Cost","Total Cost"];
    const lines = summary.rows.map((row) => [
      row.technicianName, row.workerType, new Date(row.workDate).toISOString().slice(0,10),
      row.projectInstallationId, row.workOrderId, row.regularHours.toFixed(2), row.overtimeHours.toFixed(2),
      row.hourlyRate.toFixed(2), row.regularCost.toFixed(2), row.overtimeCost.toFixed(2), row.totalCost.toFixed(2)
    ].map(csv).join(","));
    lines.push(["TOTAL","","","","",summary.totals.regularHours.toFixed(2),summary.totals.overtimeHours.toFixed(2),"",summary.totals.regularCost.toFixed(2),summary.totals.overtimeCost.toFixed(2),summary.totals.totalCost.toFixed(2)].map(csv).join(","));
    const body = [header.map(csv).join(","), ...lines].join("\r\n");

    return new Response(body, { status: 200, headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pay-period-${startDate}-to-${endDate}.csv"`,
      "X-Content-Type-Options": "nosniff"
    }});
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Pay period export failed." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
