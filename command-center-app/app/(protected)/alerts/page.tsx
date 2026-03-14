import Link from "next/link";
import { AlertSeverity, AlertStatus } from "@prisma/client";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AlertRecordsTable } from "@/components/monitoring/alert-records-table";
import { FilterBar } from "@/components/management/filter-bar";
import { PaginationControls } from "@/components/management/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { getAlertsList } from "@/lib/management/alerts";
import { buildHref } from "@/lib/management/pagination";
import {
  getPageParam,
  getSearchParamValue
} from "@/lib/management/search-params";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  routeAccess
} from "@/lib/rbac";
import { formatEnumLabel } from "@/lib/utils";

type AlertsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const alertSeverityOptions = Object.values(AlertSeverity);
const alertStatusOptions = Object.values(AlertStatus);

export default async function AlertsPage({ searchParams = {} }: AlertsPageProps) {
  const user = await requireRoles(routeAccess.alerts);
  const query = getSearchParamValue(searchParams.query);
  const organizationId = getSearchParamValue(searchParams.organizationId);
  const siteId = getSearchParamValue(searchParams.siteId);
  const projectInstallationId = getSearchParamValue(
    searchParams.projectInstallationId
  );
  const rawSeverity = getSearchParamValue(searchParams.severity);
  const rawStatus = getSearchParamValue(searchParams.status);
  const page = getPageParam(searchParams.page);
  const severity = alertSeverityOptions.includes(rawSeverity as AlertSeverity)
    ? (rawSeverity as AlertSeverity)
    : "";
  const status = alertStatusOptions.includes(rawStatus as AlertStatus)
    ? (rawStatus as AlertStatus)
    : "";
  const results = await getAlertsList(user, {
    query,
    organizationId,
    siteId,
    projectInstallationId,
    severity,
    status,
    page
  });
  const baseParams = {
    query: query || undefined,
    organizationId: organizationId || undefined,
    siteId: siteId || undefined,
    projectInstallationId: projectInstallationId || undefined,
    severity: severity || undefined,
    status: status || undefined
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alerts"
        title="Alert operations"
        description="Tenant-safe monitoring events with acknowledgment and resolution workflows."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Alerts"
          }
        ]}
      />

      <FilterBar>
        <form className="grid gap-3 xl:grid-cols-[1.2fr_200px_200px_220px_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={query}
              placeholder="Search title or description"
              className="pl-9"
            />
          </div>
          <Select name="organizationId" defaultValue={organizationId}>
            <option value="">All organizations</option>
            {results.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
          <Select name="siteId" defaultValue={siteId}>
            <option value="">All sites</option>
            {results.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </Select>
          <Select
            name="projectInstallationId"
            defaultValue={projectInstallationId}
          >
            <option value="">All projects</option>
            {results.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select name="severity" defaultValue={severity || ""}>
            <option value="">All severities</option>
            {alertSeverityOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {alertStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/alerts">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      <AlertRecordsTable
        title="Live alert stream"
        description="Real Prisma-backed alerts scoped to your accessible organizations, sites, and devices."
        alerts={results.alerts}
        redirectTo="/alerts"
        canAcknowledge={canAcknowledgeAlerts(user.role)}
        canResolve={canResolveAlerts(user.role)}
      />

      {results.totalCount > 0 ? (
        <PaginationControls
          page={page}
          totalPages={results.totalPages}
          totalCount={results.totalCount}
          pageSize={results.pageSize}
          prevHref={
            page > 1
              ? buildHref("/alerts", baseParams, {
                  page: String(page - 1)
                })
              : undefined
          }
          nextHref={
            page < results.totalPages
              ? buildHref("/alerts", baseParams, {
                  page: String(page + 1)
                })
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
