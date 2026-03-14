import { notFound } from "next/navigation";

import { CommissioningReportView } from "@/components/reports/commissioning-report-view";
import { requireRoles } from "@/lib/auth";
import { getSiteCommissioningReport } from "@/lib/management/commissioning-report";
import { routeAccess } from "@/lib/rbac";

type SiteExportPageProps = {
  params: {
    id: string;
  };
};

export default async function SiteExportPage({
  params
}: SiteExportPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const report = await getSiteCommissioningReport(user, params.id);

  if (!report) {
    notFound();
  }

  return <CommissioningReportView report={report} />;
}
