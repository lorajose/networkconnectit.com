import Link from "next/link";

import { SummaryTable } from "@/components/dashboard/summary-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type {
  AlertSeverity,
  AlertTableRow,
  AlertWorkflowStatus,
  FilterToken
} from "@/lib/dashboard/types";
import { formatDateTime } from "@/lib/utils";
import { FilterRowPlaceholder } from "@/components/dashboard/filter-row-placeholder";

function severityTone(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "unknown";
  }
}

function workflowTone(status: AlertWorkflowStatus) {
  switch (status) {
    case "resolved":
      return "healthy";
    case "acknowledged":
      return "warning";
    default:
      return "critical";
  }
}

type RecentAlertsTableProps = {
  title: string;
  description: string;
  rows: readonly AlertTableRow[];
  filters: readonly FilterToken[];
  showOrganization?: boolean;
};

export function RecentAlertsTable({
  title,
  description,
  rows,
  filters,
  showOrganization = true
}: RecentAlertsTableProps) {
  const headers = showOrganization
    ? ["Severity", "Title", "Organization", "Site", "Device", "Status", "Created at"]
    : ["Severity", "Title", "Site", "Device", "Status", "Created at"];

  return (
    <SummaryTable
      title={title}
      description={description}
      headers={headers}
      rowCount={rows.length}
      toolbar={<FilterRowPlaceholder filters={filters} label="Alert filters" />}
    >
      {rows.map((row) => (
        <tr key={row.id} className="align-top">
          <td className="px-4 py-4 sm:px-5">
            <StatusBadge tone={severityTone(row.severity)} label={row.severity} />
          </td>
          <td className="px-4 py-4 sm:px-5">
            <div className="space-y-1">
              {row.alertHref ? (
                <Link href={row.alertHref} className="font-medium text-foreground hover:text-primary">
                  {row.title}
                </Link>
              ) : (
                <p className="font-medium text-foreground">{row.title}</p>
              )}
              <p className="text-xs text-muted-foreground">Alert ID {row.id}</p>
            </div>
          </td>
          {showOrganization ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {row.organizationHref ? (
                <Link href={row.organizationHref} className="hover:text-foreground">
                  {row.organization}
                </Link>
              ) : (
                row.organization
              )}
            </td>
          ) : null}
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {row.siteHref ? (
              <Link href={row.siteHref} className="hover:text-foreground">
                {row.site}
              </Link>
            ) : (
              row.site
            )}
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {row.deviceHref ? (
              <Link href={row.deviceHref} className="hover:text-foreground">
                {row.device}
              </Link>
            ) : (
              row.device
            )}
          </td>
          <td className="px-4 py-4 sm:px-5">
            <StatusBadge
              tone={workflowTone(row.status)}
              label={row.status}
              withIcon
            />
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {formatDateTime(row.createdAt)}
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}
