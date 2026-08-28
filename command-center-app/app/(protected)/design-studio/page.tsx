import Link from "next/link";
import { Layers3, MousePointer2, Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { listDesignProjects } from "@/lib/contractor-os/design-studio-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { createDesignProjectAction } from "./actions";

type DesignStudioPageProps = { searchParams?: { organizationId?: string } };

export default async function DesignStudioPage({ searchParams }: DesignStudioPageProps) {
  const user = await requireRoles(routeAccess.designStudio);
  const tenantOrganizationId = user.organizationId ?? null;
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";
  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const projects = selectedOrganizationId
    ? await listDesignProjects({ role: user.role, organizationId: tenantOrganizationId }, selectedOrganizationId)
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Design Studio</h1>
        <p className="max-w-4xl text-muted-foreground">Tenant-backed low-voltage design projects for CCTV, access control, intrusion, network and cable planning.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><MousePointer2 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Interactive canvas</CardTitle><CardDescription>Pointer/touch selection, drag, pan, zoom, rotation and keyboard commands.</CardDescription></CardHeader></Card>
        <Card><CardHeader><Layers3 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Renderer independent</CardTitle><CardDescription>Persisted project/floor data remains independent from the SVG rendering adapter.</CardDescription></CardHeader></Card>
        <Card><CardHeader><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Tenant isolated</CardTitle><CardDescription>Every project and floor lookup is scoped to its organization.</CardDescription></CardHeader></Card>
      </div>

      {isGlobalAdmin ? (
        <Card><CardHeader><CardTitle className="text-lg">Organization context</CardTitle><CardDescription>Select the tenant whose design projects you want to manage.</CardDescription></CardHeader><CardContent><form method="get" className="flex max-w-xl items-end gap-3"><div className="flex-1 space-y-2"><Label htmlFor="organization-filter">Organization</Label><Select id="organization-filter" name="organizationId" defaultValue={selectedOrganizationId} required><option value="">Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></div><Button type="submit">Load designs</Button></form></CardContent></Card>
      ) : null}

      {selectedOrganizationId ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
          <Card><CardHeader><CardTitle>Design projects</CardTitle><CardDescription>{projects.length} project{projects.length === 1 ? "" : "s"} for this organization.</CardDescription></CardHeader><CardContent className="space-y-3">
            {projects.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No Design Studio projects yet.</div> : projects.map((project) => (
              <Link key={project.id} href={`/design-studio/${project.id}?organizationId=${encodeURIComponent(selectedOrganizationId)}`} className="block rounded-2xl border border-border/70 p-4 transition hover:border-primary/50 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{project.name}</h2><p className="mt-1 text-sm text-muted-foreground">Revision {project.workingRevision}</p></div><span className="text-sm font-medium">{project.status}</span></div>
              </Link>
            ))}
          </CardContent></Card>

          <Card><CardHeader><Plus className="h-5 w-5 text-primary" /><CardTitle>Create design project</CardTitle><CardDescription>Create the tenant project and its first floor together.</CardDescription></CardHeader><CardContent><form action={createDesignProjectAction} className="space-y-4"><input type="hidden" name="organizationId" value={selectedOrganizationId} /><div className="space-y-2"><Label htmlFor="name">Project name</Label><Input id="name" name="name" placeholder="Warehouse CCTV Upgrade" required /></div><div className="space-y-2"><Label htmlFor="floorName">First floor / area</Label><Input id="floorName" name="floorName" placeholder="Level 1" /></div><Button type="submit" className="w-full">Create Design Studio project</Button></form></CardContent></Card>
        </div>
      ) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Select an organization to load Design Studio projects.</CardContent></Card>}
    </div>
  );
}
