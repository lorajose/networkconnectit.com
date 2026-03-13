import Link from "next/link";
import { OrganizationStatus } from "@prisma/client";
import { ArrowRight, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { SummaryTable } from "@/components/dashboard/summary-table";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/management/filter-bar";
import { PaginationControls } from "@/components/management/pagination-controls";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { buildHref } from "@/lib/management/pagination";
import { getOrganizationsList } from "@/lib/management/organizations";
import {
  getPageParam,
  getSearchParamValue
} from "@/lib/management/search-params";
import { organizationStatusTone } from "@/lib/status";
import { canManageOrganizations, routeAccess } from "@/lib/rbac";
import { formatDate, formatEnumLabel } from "@/lib/utils";
import { organizationStatusOptions } from "@/lib/validations/organization";

type OrganizationsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function OrganizationsPage({
  searchParams = {}
}: OrganizationsPageProps) {
  const user = await requireRoles(routeAccess.organizations);
  const query = getSearchParamValue(searchParams.query);
  const rawStatus = getSearchParamValue(searchParams.status);
  const page = getPageParam(searchParams.page);
  const status = organizationStatusOptions.includes(
    rawStatus as OrganizationStatus
  )
    ? (rawStatus as OrganizationStatus)
    : "";
  const results = await getOrganizationsList(user, {
    query,
    status,
    page
  });
  const canManage = canManageOrganizations(user.role);
  const baseParams = {
    query: query || undefined,
    status: status || undefined
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizations"
        title="Organization management"
        description="Tenant accounts, primary contacts, and high-level scope boundaries."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Organizations"
          }
        ]}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/organizations/new">
                <Plus className="h-4 w-4" />
                New organization
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <form className="grid gap-3 md:grid-cols-[1.5fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={query}
              placeholder="Search name, slug, or contact"
              className="pl-9"
            />
          </div>
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {organizationStatusOptions.map((option) => (
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
              <Link href="/organizations">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      <SummaryTable
        title="Organization directory"
        description="Prisma-backed tenant records with related site and device counts."
        headers={[
          "Organization",
          "Status",
          "Contact",
          "Sites",
          "Devices",
          "Updated",
          "Actions"
        ]}
        rowCount={results.organizations.length}
        emptyTitle="No organizations found"
        emptyDescription="Adjust the filters or create the first tenant organization."
      >
        {results.organizations.map((organization) => (
          <tr key={organization.id} className="align-top">
            <td className="px-4 py-4 sm:px-5">
              <div className="space-y-1">
                <Link
                  href={`/organizations/${organization.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {organization.name}
                </Link>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  {organization.slug}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 sm:px-5">
              <StatusBadge
                tone={organizationStatusTone(organization.status)}
                label={formatEnumLabel(organization.status)}
              />
            </td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              <div className="space-y-1">
                <p>{organization.contactName ?? "No contact set"}</p>
                <p className="text-xs">{organization.contactEmail ?? "No email set"}</p>
              </div>
            </td>
            <td className="px-4 py-4 sm:px-5">{organization._count.sites}</td>
            <td className="px-4 py-4 sm:px-5">{organization._count.devices}</td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {formatDate(organization.updatedAt)}
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/organizations/${organization.id}`}>View</Link>
                </Button>
                {canManage ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/organizations/${organization.id}/edit`}>Edit</Link>
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
              ? buildHref("/organizations", baseParams, {
                  page: String(page - 1)
                })
              : undefined
          }
          nextHref={
            page < results.totalPages
              ? buildHref("/organizations", baseParams, {
                  page: String(page + 1)
                })
              : undefined
          }
        />
      ) : (
        <EmptyState
          title="Organization management is ready"
          description="Create an organization once your first client or tenant needs command-center access."
          action={
            canManage ? (
              <Button asChild>
                <Link href="/organizations/new">
                  <Plus className="h-4 w-4" />
                  New organization
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
