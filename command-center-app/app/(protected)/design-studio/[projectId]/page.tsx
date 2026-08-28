import Link from "next/link";
import { notFound } from "next/navigation";

import { DesignCanvas } from "@/components/design-studio/design-canvas";
import { DesignVersionHistory } from "@/components/design-studio/design-version-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getDesignProject, listDesignFloors, loadDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { listDesignVersions } from "@/lib/contractor-os/design-version-repository";
import { routeAccess } from "@/lib/rbac";

type ProjectPageProps = {
  params: { projectId: string };
  searchParams?: { organizationId?: string; floorId?: string };
};

export default async function DesignStudioProjectPage({ params, searchParams }: ProjectPageProps) {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = user.organizationId ?? searchParams?.organizationId ?? "";
  if (!requestedOrganizationId) notFound();
  const actor = { role: user.role, organizationId: user.organizationId };
  const project = await getDesignProject(actor, params.projectId, requestedOrganizationId);
  if (!project) notFound();
  const [floors, versions] = await Promise.all([
    listDesignFloors(actor, params.projectId, requestedOrganizationId),
    listDesignVersions(actor, params.projectId, requestedOrganizationId),
  ]);
  const selectedFloor = floors.find((floor) => floor.id === searchParams?.floorId) ?? floors[0] ?? null;
  const initialDocument = selectedFloor
    ? await loadDesignFloorCanvas(actor, params.projectId, selectedFloor.id, requestedOrganizationId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Design Studio</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1><p className="mt-2 text-sm text-muted-foreground">Working revision {project.workingRevision} · {project.status}</p></div>
        <Button asChild variant="outline"><Link href={`/design-studio?organizationId=${encodeURIComponent(requestedOrganizationId)}`}>All designs</Link></Button>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Floors / areas</CardTitle><CardDescription>Each floor and its canvas elements are loaded through the tenant-scoped DesignProject relationship.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">
        {floors.map((floor) => <Button key={floor.id} asChild size="sm" variant={floor.id === selectedFloor?.id ? "default" : "outline"}><Link href={`/design-studio/${project.id}?organizationId=${encodeURIComponent(requestedOrganizationId)}&floorId=${encodeURIComponent(floor.id)}`}>{floor.name}</Link></Button>)}
        {floors.length === 0 ? <p className="text-sm text-muted-foreground">No floors have been created for this project.</p> : null}
      </CardContent></Card>

      {selectedFloor && initialDocument ? (
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="font-medium">{selectedFloor.name}</span><span className="ml-2 text-muted-foreground">{selectedFloor.canvasWidth.toString()} × {selectedFloor.canvasHeight.toString()} design units</span></div><span className="text-muted-foreground">Scale: {selectedFloor.realUnitsPerDesignUnit ? `${selectedFloor.realUnitsPerDesignUnit.toString()} ${selectedFloor.scaleUnit}/unit` : "not calibrated"}</span></div><DesignCanvas initialDocument={initialDocument} organizationId={requestedOrganizationId} projectId={project.id} floorId={selectedFloor.id} initialRevision={project.workingRevision} /></div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-lg">Version history</CardTitle><CardDescription>Create immutable design checkpoints and restore earlier project geometry without overwriting history.</CardDescription></CardHeader>
        <CardContent><DesignVersionHistory organizationId={requestedOrganizationId} projectId={project.id} workingRevision={project.workingRevision} versions={versions} /></CardContent>
      </Card>
    </div>
  );
}
