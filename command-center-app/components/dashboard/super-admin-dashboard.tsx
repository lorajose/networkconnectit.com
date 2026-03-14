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

type SuperAdminDashboardProps = {
  snapshot: DashboardSnapshot;
  userRole: AppRole;
  extraActions?: ReactNode;
};

export function SuperAdminDashboard({
  snapshot,
  userRole,
  extraActions
}: SuperAdminDashboardProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global Command View"
        title={snapshot.title}
        description={snapshot.subtitle}
        breadcrumbs={snapshot.breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {extraActions}
            <Badge variant="outline">Prisma-backed overview</Badge>
            <Badge>{roleLabels[userRole]}</Badge>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Status Overview</h2>
          <p className="text-sm text-muted-foreground">
            Compact operational signals for healthy, degraded, and active issue volume.
          </p>
        </div>
        <StatusOverviewWidgets items={snapshot.statusOverview} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SiteMap map={snapshot.map} filters={snapshot.filters} />
        <DeviceDistribution
          title={snapshot.deviceDistribution.title}
          description={snapshot.deviceDistribution.description}
          items={snapshot.deviceDistribution.items}
          filters={snapshot.filters}
        />
      </section>

      <RecentAlertsTable
        title={snapshot.recentAlerts.title}
        description={snapshot.recentAlerts.description}
        rows={snapshot.recentAlerts.rows}
        filters={snapshot.filters}
      />

      <SiteHealthTable
        title={snapshot.siteHealth.title}
        description={snapshot.siteHealth.description}
        rows={snapshot.siteHealth.rows}
        filters={snapshot.filters}
      />
    </div>
  );
}
