import Link from "next/link";
import { notFound } from "next/navigation";

import { updateDesignFloorBackgroundAction, updateDesignFloorPdfPageAction, uploadDesignFloorPlanAction } from "@/app/(protected)/design-studio/actions";
import { DesignCanvas } from "@/components/design-studio/design-canvas";
import { DesignVersionHistory } from "@/components/design-studio/design-version-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getDesignFloorBackground } from "@/lib/contractor-os/design-floor-background-repository";
import { getDesignProject, listDesignFloors, loadDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { listDesignVersions } from "@/lib/contractor-os/design-version-repository";
import { routeAccess } from "@/lib/rbac";

type ProjectPageProps = {
  params: { projectId: string };
  searchParams?: { organizationId?: string; floorId?: string };
};

function formatBytes(value: bigint) {
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function appBasePath() {
  const raw = process.env.NEXT_PUBLIC_APP_BASE_PATH?.trim() ?? "";
  return raw && raw !== "/" ? raw.replace(/\/+$/, "") : "";
}

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
  const [initialDocument, background] = selectedFloor
    ? await Promise.all([
        loadDesignFloorCanvas(actor, params.projectId, selectedFloor.id, requestedOrganizationId),
        getDesignFloorBackground(actor, params.projectId, selectedFloor.id, requestedOrganizationId),
      ])
    : [null, null];
  const backgroundUrl = selectedFloor && background
    ? `${appBasePath()}/api/design-studio/background?organizationId=${encodeURIComponent(requestedOrganizationId)}&projectId=${encodeURIComponent(project.id)}&floorId=${encodeURIComponent(selectedFloor.id)}`
    : null;
  const pdfPreviewUrl = backgroundUrl && background?.mimeType === "application/pdf"
    ? `${backgroundUrl}#page=${background.backgroundPdfPage}&toolbar=0&navpanes=0`
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

      {selectedFloor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Floor plan background</CardTitle>
            <CardDescription>Upload a private PDF, JPG or PNG and attach it to {selectedFloor.name}. Files remain tenant-scoped and are never stored under the public web directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {background ? (
              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="font-medium">{background.originalName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{background.mimeType} · {formatBytes(background.byteSize)} · SHA-256 {background.sha256.slice(0, 16)}…</p>
                <p className="mt-1 text-xs text-muted-foreground">Imported {background.createdAt.toLocaleString()}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No floor plan is attached to this floor yet.</p>}
            <form action={uploadDesignFloorPlanAction} className="flex flex-col gap-3 sm:flex-row sm:items-end" encType="multipart/form-data">
              <input type="hidden" name="organizationId" value={requestedOrganizationId} />
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="floorId" value={selectedFloor.id} />
              <label className="flex-1 text-sm font-medium">Floor plan file<input className="mt-2 block w-full rounded-lg border bg-background px-3 py-2 text-sm" type="file" name="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></label>
              <Button type="submit">{background ? "Replace background" : "Upload background"}</Button>
            </form>
            {background ? (
              <form action={updateDesignFloorBackgroundAction} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                <input type="hidden" name="organizationId" value={requestedOrganizationId} />
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="floorId" value={selectedFloor.id} />
                <label className="text-sm font-medium">Opacity
                  <input className="mt-2 w-full" type="range" name="opacityPercent" min="10" max="100" step="5" defaultValue={Math.round(Number(background.backgroundOpacity) * 100)} />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={background.backgroundVisible} />Visible</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="locked" defaultChecked={background.backgroundLocked} />Locked</label>
                <Button type="submit" variant="outline">Apply display</Button>
              </form>
            ) : null}
            {background?.mimeType === "application/pdf" && pdfPreviewUrl ? (
              <div className="space-y-3 rounded-xl border p-3">
                <form action={updateDesignFloorPdfPageAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="organizationId" value={requestedOrganizationId} />
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="floorId" value={selectedFloor.id} />
                  <label className="text-sm font-medium">PDF page
                    <input className="mt-2 block w-28 rounded-lg border bg-background px-3 py-2" type="number" name="pdfPage" min="1" max="10000" step="1" defaultValue={background.backgroundPdfPage} required />
                  </label>
                  <Button type="submit" variant="outline">Use page</Button>
                  <span className="pb-2 text-xs text-muted-foreground">Selected page {background.backgroundPdfPage}</span>
                </form>
                <div className="overflow-hidden rounded-lg border bg-muted/20">
                  <iframe title={`PDF preview page ${background.backgroundPdfPage}`} src={pdfPreviewUrl} className="h-[520px] w-full" />
                </div>
                <p className="text-xs text-muted-foreground">The selected page is also aligned beneath the interactive Design Studio canvas. Authenticated byte-range responses improve embedded PDF compatibility while keeping the source private.</p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Maximum 50 MB by default. MIME, file signature and extension must agree before the file is accepted.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedFloor && initialDocument ? (
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="font-medium">{selectedFloor.name}</span><span className="ml-2 text-muted-foreground">{selectedFloor.canvasWidth.toString()} × {selectedFloor.canvasHeight.toString()} design units</span></div><span className="text-muted-foreground">Scale: {selectedFloor.realUnitsPerDesignUnit ? `${selectedFloor.realUnitsPerDesignUnit.toString()} ${selectedFloor.scaleUnit}/unit` : "not calibrated"}</span></div><DesignCanvas initialDocument={initialDocument} organizationId={requestedOrganizationId} projectId={project.id} floorId={selectedFloor.id} initialRevision={project.workingRevision} background={background && backgroundUrl ? { url: backgroundUrl, mimeType: background.mimeType, opacity: Number(background.backgroundOpacity), visible: background.backgroundVisible, locked: background.backgroundLocked, width: Number(selectedFloor.canvasWidth), height: Number(selectedFloor.canvasHeight), pdfPage: background.backgroundPdfPage } : null} /></div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-lg">Version history</CardTitle><CardDescription>Create immutable design checkpoints and restore earlier project geometry without overwriting history.</CardDescription></CardHeader>
        <CardContent><DesignVersionHistory organizationId={requestedOrganizationId} projectId={project.id} workingRevision={project.workingRevision} versions={versions} /></CardContent>
      </Card>
    </div>
  );
}
