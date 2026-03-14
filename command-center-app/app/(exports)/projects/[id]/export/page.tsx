import { notFound } from "next/navigation";

import { CommissioningReportView } from "@/components/reports/commissioning-report-view";
import { requireRoles } from "@/lib/auth";
import { getProjectCommissioningReport } from "@/lib/management/commissioning-report";
import { routeAccess } from "@/lib/rbac";

type ProjectExportPageProps = {
  params: {
    id: string;
  };
};

export default async function ProjectExportPage({
  params
}: ProjectExportPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const report = await getProjectCommissioningReport(user, params.id);

  if (!report) {
    notFound();
  }

  return <CommissioningReportView report={report} />;
}
