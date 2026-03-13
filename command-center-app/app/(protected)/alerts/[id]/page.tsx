import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { AlertSeverityBadge } from "@/components/monitoring/alert-severity-badge";
import { AlertStatusBadge } from "@/components/monitoring/alert-status-badge";
import { AlertWorkflowActions } from "@/components/monitoring/alert-workflow-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getAlertDetail } from "@/lib/management/alerts";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  routeAccess
} from "@/lib/rbac";
import { formatDate, formatOptionalDateTime } from "@/lib/utils";

type AlertDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AlertDetailPage({
  params
}: AlertDetailPageProps) {
  const user = await requireRoles(routeAccess.alerts);
  const alert = await getAlertDetail(user, params.id);

  if (!alert) {
    notFound();
  }

  const redirectTo = `/alerts/${alert.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alerts"
        title={alert.title}
        description="Alert metadata, related references, workflow state, and description."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Alerts",
            href: "/alerts"
          },
          {
            label: alert.title
          }
        ]}
        actions={
          <AlertWorkflowActions
            alertId={alert.id}
            status={alert.status}
            redirectTo={redirectTo}
            canAcknowledge={canAcknowledgeAlerts(user.role)}
            canResolve={canResolveAlerts(user.role)}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Severity</CardDescription>
            <CardTitle>
              <AlertSeverityBadge severity={alert.severity} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <AlertStatusBadge status={alert.status} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Created</CardDescription>
            <CardTitle className="text-lg">{formatDate(alert.createdAt)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Triggered {formatOptionalDateTime(alert.triggeredAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-lg">
              {alert.resolvedAt ? formatDate(alert.resolvedAt) : "Open"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Acknowledged {formatOptionalDateTime(alert.acknowledgedAt)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>
              Current alert narrative and response context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4 leading-6 text-foreground">
              {alert.message}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Created by
                </p>
                <p className="mt-1 text-foreground">
                  {alert.createdBy?.name ?? alert.createdBy?.email ?? "System / simulation"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Resolved by
                </p>
                <p className="mt-1 text-foreground">
                  {alert.resolvedBy?.name ?? alert.resolvedBy?.email ?? "Not resolved"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>References</CardTitle>
            <CardDescription>
              Tenant-safe links to the related organization, site, and device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Organization
              </p>
              <Link
                href={`/organizations/${alert.organization.id}`}
                className="mt-1 block font-medium text-foreground hover:text-primary"
              >
                {alert.organization.name}
              </Link>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Site
              </p>
              {alert.site ? (
                <Link
                  href={`/sites/${alert.site.id}`}
                  className="mt-1 block font-medium text-foreground hover:text-primary"
                >
                  {alert.site.name}
                </Link>
              ) : (
                <p className="mt-1 text-foreground">Unassigned</p>
              )}
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Device
              </p>
              {alert.device ? (
                <Link
                  href={`/devices/${alert.device.id}`}
                  className="mt-1 block font-medium text-foreground hover:text-primary"
                >
                  {alert.device.name}
                </Link>
              ) : (
                <p className="mt-1 text-foreground">N/A</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
