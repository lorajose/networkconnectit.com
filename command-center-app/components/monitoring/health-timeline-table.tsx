import Link from "next/link";

import { SummaryTable } from "@/components/dashboard/summary-table";
import { HealthStatusBadge } from "@/components/monitoring/health-status-badge";
import type { HealthTimelineEntry } from "@/lib/management/health";
import { formatDateTime, formatEnumLabel } from "@/lib/utils";

type HealthTimelineTableProps = {
  title: string;
  description: string;
  entries: HealthTimelineEntry[];
  showOrganization?: boolean;
  showSite?: boolean;
  showDevice?: boolean;
};

export function HealthTimelineTable({
  title,
  description,
  entries,
  showOrganization = false,
  showSite = true,
  showDevice = true
}: HealthTimelineTableProps) {
  const headers = [
    ...(showOrganization ? ["Organization"] : []),
    ...(showSite ? ["Site"] : []),
    ...(showDevice ? ["Device"] : []),
    "Check type",
    "Status",
    "Latency",
    "Checked at",
    "Message"
  ];

  return (
    <SummaryTable
      title={title}
      description={description}
      headers={headers}
      rowCount={entries.length}
      emptyTitle="No health checks"
      emptyDescription="Run a simulated health check to create monitoring history for this scope."
    >
      {entries.map((entry) => (
        <tr key={entry.id} className="align-top">
          {showOrganization ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              <Link href={`/organizations/${entry.organizationId}`} className="hover:text-foreground">
                {entry.organizationName}
              </Link>
            </td>
          ) : null}
          {showSite ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              <Link href={`/sites/${entry.siteId}`} className="hover:text-foreground">
                {entry.siteName}
              </Link>
            </td>
          ) : null}
          {showDevice ? (
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              <Link href={`/devices/${entry.deviceId}`} className="hover:text-foreground">
                {entry.deviceName}
              </Link>
            </td>
          ) : null}
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {formatEnumLabel(entry.checkType)}
          </td>
          <td className="px-4 py-4 sm:px-5">
            <HealthStatusBadge status={entry.status} />
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {entry.latencyMs !== null ? `${entry.latencyMs} ms` : "N/A"}
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {formatDateTime(entry.checkedAt.toISOString())}
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {entry.message ?? "No message"}
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}
