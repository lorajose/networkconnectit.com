import Link from "next/link";
import { SiteStatus } from "@prisma/client";
import { Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SummaryTable } from "@/components/dashboard/summary-table";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/management/filter-bar";
import { PaginationControls } from "@/components/management/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { buildHref } from "@/lib/management/pagination";
import {
  getPageParam,
  getSearchParamValue
} from "@/lib/management/search-params";
import { getSitesList } from "@/lib/management/sites";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";
import { siteStatusTone } from "@/lib/status";
import {
  formatDate,
  formatEnumLabel,
  formatLocation
} from "@/lib/utils";
import { siteStatusOptions } from "@/lib/validations/site";

type SitesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SitesPage({ searchParams = {} }: SitesPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const query = getSearchParamValue(searchParams.query);
  const organizationId = getSearchParamValue(searchParams.organizationId);
  const projectInstallationId = getSearchParamValue(
    searchParams.projectInstallationId
  );
  const country = getSearchParamValue(searchParams.country);
  const rawStatus = getSearchParamValue(searchParams.status);
  const page = getPageParam(searchParams.page);
  const status = siteStatusOptions.includes(rawStatus as SiteStatus)
    ? (rawStatus as SiteStatus)
    : "";
  const results = await getSitesList(user, {
    query,
    organizationId,
    projectInstallationId,
    country,
    status,
    page
  });
  const canWrite = canWriteTenantInventory(user.role);
  const baseParams = {
    query: query || undefined,
    organizationId: organizationId || undefined,
    projectInstallationId: projectInstallationId || undefined,
    country: country || undefined,
    status: status || undefined
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sites"
        title="Site inventory"
        description="Location records, deployment metadata, and tenant-scoped operating sites."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Sites"
          }
        ]}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/sites/new">
                <Plus className="h-4 w-4" />
                New site
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <form className="grid gap-3 xl:grid-cols-[1.4fr_200px_220px_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={query}
              placeholder="Search site name or city"
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
          <Select name="country" defaultValue={country}>
            <option value="">All countries</option>
            {results.countries.map((countryName) => (
              <option key={countryName} value={countryName}>
                {countryName}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {siteStatusOptions.map((option) => (
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
              <Link href="/sites">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      <SummaryTable
        title="Site directory"
        description="Prisma-backed site records scoped by organization, country, and operating status."
        headers={[
          "Site",
          "Organization",
          "Location",
          "Devices",
          "Projects",
          "Status",
          "Updated",
          "Actions"
        ]}
        rowCount={results.sites.length}
        emptyTitle="No sites found"
        emptyDescription="Adjust the filters or create the first site inside an accessible organization."
      >
        {results.sites.map((site) => (
          <tr key={site.id}>
            <td className="px-4 py-4 sm:px-5">
              <div className="space-y-1">
                <Link
                  href={`/sites/${site.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {site.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {site.timezone ?? "Timezone not set"}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 sm:px-5">{site.organization.name}</td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {formatLocation([site.city, site.country])}
            </td>
            <td className="px-4 py-4 sm:px-5">{site._count.devices}</td>
            <td className="px-4 py-4 sm:px-5">{site._count.projectSites}</td>
            <td className="px-4 py-4 sm:px-5">
              <StatusBadge
                tone={siteStatusTone(site.status)}
                label={formatEnumLabel(site.status)}
              />
            </td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {formatDate(site.updatedAt)}
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sites/${site.id}`}>View</Link>
                </Button>
                {canWrite ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/sites/${site.id}/edit`}>Edit</Link>
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </SummaryTable>

      {results.totalCount > 0 ? (
        <PaginationControls
          page={page}
          totalPages={results.totalPages}
          totalCount={results.totalCount}
          pageSize={results.pageSize}
          prevHref={
            page > 1
              ? buildHref("/sites", baseParams, {
                  page: String(page - 1)
                })
              : undefined
          }
          nextHref={
            page < results.totalPages
              ? buildHref("/sites", baseParams, {
                  page: String(page + 1)
                })
              : undefined
          }
        />
      ) : (
        <EmptyState
          title="Site inventory is ready"
          description="Create the first site to map deployments and attach devices within the accessible tenant scope."
          action={
            canWrite ? (
              <Button asChild>
                <Link href="/sites/new">
                  <Plus className="h-4 w-4" />
                  New site
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
