import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { DeviceDistribution } from "@/components/dashboard/device-distribution";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentAlertsTable } from "@/components/dashboard/recent-alerts-table";
import { SiteHealthTable } from "@/components/dashboard/site-health-table";
import { SiteMap } from "@/components/dashboard/site-map";
import { StatusOverviewWidgets } from "@/components/dashboard/status-overview-widgets";
import type { DashboardSnapshot } from "@/lib/dashboard/types";
import { roleLabels, type AppRole } from "@/lib/rbac";

type ViewerDashboardProps = {
  snapshot: DashboardSnapshot;
  userRole: AppRole;
  viewerPortal?: boolean;
  extraActions?: ReactNode;
};

export function ViewerDashboard({
  snapshot,
  userRole,
  viewerPortal = false,
  extraActions
}: ViewerDashboardProps) {
  const title = viewerPortal ? "Viewer Portal" : snapshot.title;
  const description = viewerPortal
    ? `${snapshot.organizationName ?? "Assigned organization"} read-only visibility for sites, devices, and alerts.`
    : snapshot.subtitle;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={viewerPortal ? "Read-only Operations View" : "Organization View"}
        title={title}
        description={description}
        breadcrumbs={
          viewerPortal
            ? [
                {
                  label: "Command Center"
                },
                {
                  label: "Viewer Portal"
                }
              ]
            : snapshot.breadcrumbs
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {extraActions}
            <Badge variant="outline">Read-only live view</Badge>
            <Badge variant="outline">{snapshot.organizationName ?? "Assigned org"}</Badge>
            <Badge>{roleLabels[userRole]}</Badge>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <SiteMap map={snapshot.map} filters={snapshot.filters} />
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Status Overview</h2>
              <p className="text-sm text-muted-foreground">
                Focused monitoring signals scoped to your visible organization data.
              </p>
            </div>
            <StatusOverviewWidgets items={snapshot.statusOverview} />
          </section>
          <DeviceDistribution
            title={snapshot.deviceDistribution.title}
            description={snapshot.deviceDistribution.description}
            items={snapshot.deviceDistribution.items}
            filters={snapshot.filters}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SiteHealthTable
          title={snapshot.siteHealth.title}
          description={snapshot.siteHealth.description}
          rows={snapshot.siteHealth.rows}
          filters={snapshot.filters}
          compact
          showOrganization={false}
        />
        <RecentAlertsTable
          title={snapshot.recentAlerts.title}
          description={snapshot.recentAlerts.description}
          rows={snapshot.recentAlerts.rows}
          filters={snapshot.filters}
          showOrganization={false}
        />
      </section>
    </div>
  );
}
