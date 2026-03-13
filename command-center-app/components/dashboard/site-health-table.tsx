import Link from "next/link";

import { SummaryTable } from "@/components/dashboard/summary-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { FilterToken, SiteHealthRow } from "@/lib/dashboard/types";
import { formatOptionalDateTime } from "@/lib/utils";
import { FilterRowPlaceholder } from "@/components/dashboard/filter-row-placeholder";

type SiteHealthTableProps = {
  title: string;
  description: string;
  rows: readonly SiteHealthRow[];
  filters: readonly FilterToken[];
  compact?: boolean;
  showOrganization?: boolean;
};

export function SiteHealthTable({
  title,
  description,
  rows,
  filters,
  compact = false,
  showOrganization = true
}: SiteHealthTableProps) {
  const headers = compact
    ? showOrganization
      ? ["Organization", "Site", "Location", "Devices", "Last check", "Health"]
      : ["Site", "Location", "Devices", "Last check", "Health"]
    : showOrganization
      ? [
          "Organization",
          "Site",
          "Location",
          "Devices",
          "Online",
          "Offline",
          "Last check",
          "Health"
        ]
      : ["Site", "Location", "Devices", "Online", "Offline", "Last check", "Health"];

  return (
    <SummaryTable
      title={title}
      description={description}
      headers={headers}
      rowCount={rows.length}
      toolbar={<FilterRowPlaceholder filters={filters} label="Site filters" />}
    >
      {rows.map((row) => (
        <tr key={row.id} className="align-top">
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
          <td className="px-4 py-4 sm:px-5">
            <div className="space-y-1">
              {row.siteHref ? (
                <Link href={row.siteHref} className="font-medium text-foreground hover:text-primary">
                  {row.site}
                </Link>
              ) : (
                <p className="font-medium text-foreground">{row.site}</p>
              )}
              {!compact ? (
                <p className="text-xs text-muted-foreground">Site health summary</p>
              ) : null}
            </div>
          </td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">{row.location}</td>
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {row.devicesCount}
          </td>
          {!compact ? (
            <>
              <td className="px-4 py-4 text-emerald-300 sm:px-5">
                {row.onlineCount}
              </td>
              <td className="px-4 py-4 text-rose-300 sm:px-5">
                {row.offlineCount}
              </td>
            </>
          ) : null}
          <td className="px-4 py-4 text-muted-foreground sm:px-5">
            {formatOptionalDateTime(row.lastCheck)}
          </td>
          <td className="px-4 py-4 sm:px-5">
            <StatusBadge tone={row.health} label={row.health} />
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}
