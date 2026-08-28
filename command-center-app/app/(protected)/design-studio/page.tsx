import { Layers3, MousePointer2, ShieldCheck } from "lucide-react";

import { DesignCanvas } from "@/components/design-studio/design-canvas";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

export default async function DesignStudioPage() {
  await requireRoles(routeAccess.designStudio);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Design Studio</h1>
        <p className="max-w-4xl text-muted-foreground">Interactive low-voltage design workspace for CCTV, access control, intrusion, network and cable planning. This preview uses the renderer-agnostic design document introduced in NCI-049/NCI-050.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><MousePointer2 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Interactive canvas</CardTitle><CardDescription>Pointer and touch-compatible selection, drag, pan, zoom, rotation and keyboard commands.</CardDescription></CardHeader></Card>
        <Card><CardHeader><Layers3 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Renderer independent</CardTitle><CardDescription>The SVG layer is a view adapter. Persisted design geometry remains independent from the renderer.</CardDescription></CardHeader></Card>
        <Card><CardHeader><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Protected workspace</CardTitle><CardDescription>Only contractor/admin roles can enter the Design Studio while tenant-backed project persistence is completed.</CardDescription></CardHeader></Card>
      </div>

      <DesignCanvas />
    </div>
  );
}
