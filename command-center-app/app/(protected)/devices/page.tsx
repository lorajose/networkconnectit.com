import Link from "next/link";
import { DeviceStatus, DeviceType } from "@prisma/client";
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
import { getDevicesList } from "@/lib/management/devices";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";
import { deviceStatusTone, monitoringModeTone } from "@/lib/status";
import {
  formatEnumLabel,
  formatLocation,
  formatOptionalDateTime
} from "@/lib/utils";
import {
  deviceStatusOptions,
  deviceTypeOptions
} from "@/lib/validations/device";

type DevicesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DevicesPage({
  searchParams = {}
}: DevicesPageProps) {
  const user = await requireRoles(routeAccess.devices);
  const query = getSearchParamValue(searchParams.query);
  const organizationId = getSearchParamValue(searchParams.organizationId);
  const siteId = getSearchParamValue(searchParams.siteId);
  const brand = getSearchParamValue(searchParams.brand);
  const rawType = getSearchParamValue(searchParams.type);
  const rawStatus = getSearchParamValue(searchParams.status);
  const page = getPageParam(searchParams.page);
  const type = deviceTypeOptions.includes(rawType as DeviceType)
    ? (rawType as DeviceType)
    : "";
  const status = deviceStatusOptions.includes(rawStatus as DeviceStatus)
    ? (rawStatus as DeviceStatus)
    : "";
  const results = await getDevicesList(user, {
    query,
    organizationId,
    siteId,
    brand,
    type,
    status,
    page
  });
  const canWrite = canWriteTenantInventory(user.role);
  const baseParams = {
    query: query || undefined,
    organizationId: organizationId || undefined,
    siteId: siteId || undefined,
    brand: brand || undefined,
    type: type || undefined,
    status: status || undefined
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title="Device registry"
        description="Hardware inventory, network metadata, and tenant-scoped device ownership."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Devices"
          }
        ]}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/devices/new">
                <Plus className="h-4 w-4" />
                New device
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <form className="grid gap-3 xl:grid-cols-[1.5fr_220px_220px_180px_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={query}
              placeholder="Search name, model, or IP address"
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
          <Select name="brand" defaultValue={brand}>
            <option value="">All brands</option>
            {results.brands.map((brandName) => (
              <option key={brandName} value={brandName}>
                {brandName}
              </option>
            ))}
          </Select>
          <Select name="type" defaultValue={type || ""}>
            <option value="">All types</option>
            {deviceTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {deviceStatusOptions.map((option) => (
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
              <Link href="/devices">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      <SummaryTable
        title="Device inventory"
        description="Prisma-backed device records with tenant-safe organization and site context."
        headers={[
          "Device",
          "Organization",
          "Site",
          "Brand / Model",
          "Status",
          "Last seen",
          "Actions"
        ]}
        rowCount={results.devices.length}
        emptyTitle="No devices found"
        emptyDescription="Adjust the filters or add the first device inside an accessible tenant."
      >
        {results.devices.map((device) => (
          <tr key={device.id}>
            <td className="px-4 py-4 sm:px-5">
              <div className="space-y-1">
                <Link
                  href={`/devices/${device.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {device.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatEnumLabel(device.type)}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 sm:px-5">{device.organization.name}</td>
            <td className="px-4 py-4 sm:px-5">{device.site.name}</td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {device.brand}
              {device.model ? ` · ${device.model}` : ""}
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  tone={deviceStatusTone(device.status)}
                  label={formatEnumLabel(device.status)}
                />
                <StatusBadge
                  tone={monitoringModeTone(device.monitoringMode)}
                  label={formatEnumLabel(device.monitoringMode)}
                />
              </div>
            </td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {formatOptionalDateTime(device.lastSeenAt)}
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/devices/${device.id}`}>View</Link>
                </Button>
                {canWrite ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/devices/${device.id}/edit`}>Edit</Link>
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
              ? buildHref("/devices", baseParams, {
                  page: String(page - 1)
                })
              : undefined
          }
          nextHref={
            page < results.totalPages
              ? buildHref("/devices", baseParams, {
                  page: String(page + 1)
                })
              : undefined
          }
        />
      ) : (
        <EmptyState
          title="Device registry is ready"
          description="Create the first device to connect inventory to a tenant and site."
          action={
            canWrite ? (
              <Button asChild>
                <Link href="/devices/new">
                  <Plus className="h-4 w-4" />
                  New device
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
