import Link from "next/link";

import { SummaryTable } from "@/components/dashboard/summary-table";
import { AlertSeverityBadge } from "@/components/monitoring/alert-severity-badge";
import { AlertStatusBadge } from "@/components/monitoring/alert-status-badge";
import { AlertWorkflowActions } from "@/components/monitoring/alert-workflow-actions";
import type { AlertRecord } from "@/lib/management/alerts";
import { formatDateTime, formatOptionalDateTime } from "@/lib/utils";

type AlertRecordsTableProps = {
  title: string;
  description: string;
  alerts: AlertRecord[];
  redirectTo: string;
  showOrganization?: boolean;
  showSite?: boolean;
  showDevice?: boolean;
  canAcknowledge: boolean;
  canResolve: boolean;
};

export function AlertRecordsTable({
  title,
  description,
  alerts,
  redirectTo,
  showOrganization = true,
  showSite = true,
  showDevice = true,
  canAcknowledge,
  canResolve
}: AlertRecordsTableProps) {
  const headers = [
    "Severity",
    "Alert",
    ...(showOrganization ? ["Organization"] : []),
    ...(showSite ? ["Site"] : []),
    ...(showDevice ? ["Device"] : []),
    "Status",
    "Created",
    "Actions"
  ];

  return (
    <SummaryTable
      title={title}
      description={description}
      headers={headers}
      rowCount={alerts.length}
      emptyTitle="No alerts"
      emptyDescription="There are no matching alerts in the current scope."
    >
      {alerts.map((alert) => (
        <tr key={alert.id} className="align-top">
          <td className="px-4 py-4 sm:px-5">
            <AlertSeverityBadge severity={alert.severity} />
          </td>
          <td className="px-4 py-4 sm:px-5">
            <div className="space-y-1">
              <Link
                href={`/alerts/${alert.id}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {alert.title}
              </Link>
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {alert.message}
              </p>
            </div>
          </td>
          {showOrganization ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              <Link href={`/organizations/${alert.organization.id}`} className="hover:text-foreground">
                {alert.organization.name}
              </Link>
            </td>
          ) : null}
          {showSite ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {alert.site ? (
                <Link href={`/sites/${alert.site.id}`} className="hover:text-foreground">
                  {alert.site.name}
                </Link>
              ) : (
                "Unassigned"
              )}
            </td>
          ) : null}
          {showDevice ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {alert.device ? (
                <Link href={`/devices/${alert.device.id}`} className="hover:text-foreground">
                  {alert.device.name}
                </Link>
              ) : (
                "N/A"
              )}
            </td>
          ) : null}
          <td className="px-4 py-4 sm:px-5">
            <div className="space-y-2">
              <AlertStatusBadge status={alert.status} />
              {alert.resolvedAt ? (
                <p className="text-xs text-muted-foreground">
                  Resolved {formatOptionalDateTime(alert.resolvedAt)}
                </p>
              ) : null}
            </div>
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {formatDateTime(alert.createdAt.toISOString())}
          </td>
          <td className="px-4 py-4 sm:px-5">
            <AlertWorkflowActions
              alertId={alert.id}
              status={alert.status}
              redirectTo={redirectTo}
              canAcknowledge={canAcknowledge}
              canResolve={canResolve}
            />
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}
