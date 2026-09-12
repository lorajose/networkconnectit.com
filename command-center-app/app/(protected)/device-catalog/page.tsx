import { Database, Filter, Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { listDeviceCatalog } from "@/lib/contractor-os/device-catalog-repository";
import { DEVICE_CATALOG_CATEGORIES, type DeviceCatalogCategory } from "@/lib/contractor-os/device-catalog";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { createDeviceCatalogItemAction } from "./actions";

type DeviceCatalogPageProps = {
  searchParams?: {
    organizationId?: string;
    q?: string;
    manufacturer?: string;
    category?: string;
    poe?: string;
    minMp?: string;
  };
};

export default async function DeviceCatalogPage({ searchParams }: DeviceCatalogPageProps) {
  const user = await requireRoles(routeAccess.deviceCatalog);
  const tenantOrganizationId = user.organizationId ?? null;
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const category = DEVICE_CATALOG_CATEGORIES.includes(searchParams?.category as DeviceCatalogCategory)
    ? (searchParams?.category as DeviceCatalogCategory)
    : null;
  const poeRequired = searchParams?.poe === "true" ? true : searchParams?.poe === "false" ? false : null;
  const minMp = searchParams?.minMp ? Number(searchParams.minMp) : null;
  const devices = selectedOrganizationId
    ? await listDeviceCatalog(
        { role: user.role, organizationId: tenantOrganizationId, userId: user.id },
        {
          organizationId: selectedOrganizationId,
          query: searchParams?.q || null,
          manufacturer: searchParams?.manufacturer || null,
          category,
          poeRequired,
          minCameraResolutionMp: minMp != null && Number.isFinite(minMp) ? minMp : null,
        },
      )
    : [];

  const manufacturers = Array.from(new Set(devices.map((device) => device.manufacturer))).sort();
  const canWrite = user.role !== "VIEWER";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Security Device Catalog</h1>
        <p className="max-w-4xl text-muted-foreground">
          Reusable cameras, recorders, switches, access control, intrusion and network devices with immutable technical revisions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><Database className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Reusable library</CardTitle><CardDescription>Keep manufacturer and custom device data ready for future designs, takeoffs and BOMs.</CardDescription></CardHeader></Card>
        <Card><CardHeader><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Tenant safe</CardTitle><CardDescription>Organization-private devices stay isolated while approved enterprise devices can be shared.</CardDescription></CardHeader></Card>
        <Card><CardHeader><Filter className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Technical filtering</CardTitle><CardDescription>Filter by manufacturer, category, PoE requirement and camera resolution.</CardDescription></CardHeader></Card>
      </div>

      {isGlobalAdmin ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Organization context</CardTitle><CardDescription>Select the tenant whose private library should be combined with the enterprise catalog.</CardDescription></CardHeader>
          <CardContent>
            <form method="get" className="flex max-w-xl items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="organization-filter">Organization</Label>
                <Select id="organization-filter" name="organizationId" defaultValue={selectedOrganizationId} required>
                  <option value="">Select organization</option>
                  {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                </Select>
              </div>
              <Button type="submit">Load catalog</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {selectedOrganizationId ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Search & filters</CardTitle><CardDescription>Search the current tenant library plus enterprise-shared devices.</CardDescription></CardHeader>
            <CardContent>
              <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                <Input name="q" defaultValue={searchParams?.q || ""} placeholder="Manufacturer or model" className="xl:col-span-2" />
                <Select name="manufacturer" defaultValue={searchParams?.manufacturer || ""}><option value="">All manufacturers</option>{manufacturers.map((manufacturer) => <option key={manufacturer} value={manufacturer}>{manufacturer}</option>)}</Select>
                <Select name="category" defaultValue={category || ""}><option value="">All categories</option>{DEVICE_CATALOG_CATEGORIES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</Select>
                <Select name="poe" defaultValue={searchParams?.poe || ""}><option value="">Any PoE</option><option value="true">PoE required</option><option value="false">No PoE required</option></Select>
                <div className="flex gap-2"><Input name="minMp" type="number" min="0" step="0.1" defaultValue={searchParams?.minMp || ""} placeholder="Min MP" /><Button type="submit">Filter</Button></div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
            <Card>
              <CardHeader><CardTitle>Catalog devices</CardTitle><CardDescription>{devices.length} visible device{devices.length === 1 ? "" : "s"}.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {devices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No catalog devices match the selected filters.</div>
                ) : devices.map((device) => (
                  <div key={device.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="font-semibold">{device.manufacturer} {device.model}</h2><p className="mt-1 text-sm text-muted-foreground">{device.category.replaceAll("_", " ")} · revision {device.revisionNumber ?? "—"}{device.revisionLabel ? ` · ${device.revisionLabel}` : ""}</p></div>
                      <span className="rounded-full border px-2 py-1 text-xs font-medium">{device.visibility === "ENTERPRISE_SHARED" ? "Enterprise" : "Private"}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <span>PoE: {device.poeRequired == null ? "—" : device.poeRequired ? "Required" : "No"}</span>
                      <span>Power: {device.maxPowerWatts == null ? "—" : `${device.maxPowerWatts} W`}</span>
                      <span>Camera: {device.cameraResolutionMp == null ? "—" : `${device.cameraResolutionMp} MP`}</span>
                      <span>FOV: {device.horizontalFovDegrees == null ? "—" : `${device.horizontalFovDegrees}°`}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Source: {device.provenanceSource}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {canWrite ? (
              <Card>
                <CardHeader><Plus className="h-5 w-5 text-primary" /><CardTitle>Add catalog device</CardTitle><CardDescription>Create a private custom device or an enterprise-shared device if your role permits it.</CardDescription></CardHeader>
                <CardContent>
                  <form action={createDeviceCatalogItemAction} className="space-y-4">
                    <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                    <div className="space-y-2"><Label htmlFor="manufacturer">Manufacturer</Label><Input id="manufacturer" name="manufacturer" required /></div>
                    <div className="space-y-2"><Label htmlFor="model">Model</Label><Input id="model" name="model" required /></div>
                    <div className="space-y-2"><Label htmlFor="category">Category</Label><Select id="category" name="category" required>{DEVICE_CATALOG_CATEGORIES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</Select></div>
                    <div className="space-y-2"><Label htmlFor="visibility">Library</Label><Select id="visibility" name="visibility" defaultValue="ORGANIZATION_PRIVATE"><option value="ORGANIZATION_PRIVATE">Organization private</option>{isGlobalAdmin ? <option value="ENTERPRISE_SHARED">Enterprise shared</option> : null}</Select></div>
                    <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="maxPowerWatts">Max power W</Label><Input id="maxPowerWatts" name="maxPowerWatts" type="number" min="0" step="0.1" /></div><div className="space-y-2"><Label htmlFor="poeRequired">PoE</Label><Select id="poeRequired" name="poeRequired"><option value="">Unknown</option><option value="true">Required</option><option value="false">Not required</option></Select></div></div>
                    <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="cameraResolutionMp">Camera MP</Label><Input id="cameraResolutionMp" name="cameraResolutionMp" type="number" min="0" step="0.1" /></div><div className="space-y-2"><Label htmlFor="horizontalFovDegrees">Horizontal FOV</Label><Input id="horizontalFovDegrees" name="horizontalFovDegrees" type="number" min="0" max="360" step="0.1" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="lensMinMm">Lens min mm</Label><Input id="lensMinMm" name="lensMinMm" type="number" min="0" step="0.1" /></div><div className="space-y-2"><Label htmlFor="lensMaxMm">Lens max mm</Label><Input id="lensMaxMm" name="lensMaxMm" type="number" min="0" step="0.1" /></div></div>
                    <div className="space-y-2"><Label htmlFor="provenanceSource">Source / provenance</Label><Input id="provenanceSource" name="provenanceSource" placeholder="Manufacturer datasheet" required /></div>
                    <div className="space-y-2"><Label htmlFor="provenanceUrl">Source URL</Label><Input id="provenanceUrl" name="provenanceUrl" type="url" /></div>
                    <Button type="submit" className="w-full">Add device</Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      ) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Select an organization to load the device catalog.</CardContent></Card>}
    </div>
  );
}
