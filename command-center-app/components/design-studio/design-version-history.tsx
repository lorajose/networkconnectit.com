"use client";

import { useState, useTransition } from "react";
import { Eye, History, RotateCcw, Save, X } from "lucide-react";

import { createDesignCheckpointAction, getDesignVersionPreviewAction, restoreDesignVersionAction } from "@/app/(protected)/design-studio/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DesignProjectSnapshot } from "@/lib/contractor-os/design-version-snapshot";
import type { DesignVersionSummary } from "@/lib/contractor-os/design-version-repository";

type Props = {
  organizationId: string;
  projectId: string;
  workingRevision: number;
  versions: DesignVersionSummary[];
};

type PreviewState = { version: DesignVersionSummary; snapshot: DesignProjectSnapshot } | null;

export function DesignVersionHistory({ organizationId, projectId, workingRevision, versions }: Props) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [pending, startTransition] = useTransition();

  function checkpoint() {
    setMessage(null);
    startTransition(async () => {
      try {
        const version = await createDesignCheckpointAction({ organizationId, projectId, expectedRevision: workingRevision, reason });
        setReason("");
        setMessage(`Checkpoint v${version.versionNumber} created.`);
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create checkpoint");
      }
    });
  }

  function openPreview(version: DesignVersionSummary) {
    setMessage(null);
    startTransition(async () => {
      try {
        const snapshot = await getDesignVersionPreviewAction({ organizationId, projectId, versionId: version.id });
        setPreview({ version, snapshot });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to preview version");
      }
    });
  }

  function restore(version: DesignVersionSummary) {
    if (!window.confirm(`Restore design version ${version.versionNumber}? Current working elements will be replaced and a new working revision will be created.`)) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await restoreDesignVersionAction({ organizationId, projectId, versionId: version.id, expectedRevision: workingRevision });
        setMessage(`Restored version ${version.versionNumber} as working revision ${result.revision}.`);
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to restore version");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Checkpoint note (optional)" maxLength={255} />
        <Button type="button" onClick={checkpoint} disabled={pending}><Save className="mr-2 h-4 w-4" />Create checkpoint</Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {preview ? (
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-medium">Preview version {preview.version.versionNumber}</p><p className="text-xs text-muted-foreground">Source revision {preview.snapshot.sourceRevision} · {preview.snapshot.floors.length} floor(s) · {preview.snapshot.elements.length} element(s)</p></div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}><X className="mr-2 h-4 w-4" />Close</Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {preview.snapshot.floors.map((floor) => {
              const floorElements = preview.snapshot.elements.filter((element) => element.floorId === floor.id);
              const width = Math.max(Number(floor.canvasWidth) || 1000, 1);
              const height = Math.max(Number(floor.canvasHeight) || 1000, 1);
              return (
                <div key={floor.id} className="rounded-lg border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-medium">{floor.name}</span><span className="text-xs text-muted-foreground">{floorElements.length} elements</span></div>
                  <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full rounded-md bg-slate-950" role="img" aria-label={`Version ${preview.version.versionNumber} preview for ${floor.name}`}>
                    {floorElements.map((element) => {
                      const point = element.geometry.points[0];
                      if (!point) return null;
                      const elementWidth = element.geometry.width ?? Math.max(width * 0.035, 12);
                      const elementHeight = element.geometry.height ?? Math.max(height * 0.025, 10);
                      return <rect key={element.id} x={point.x - elementWidth / 2} y={point.y - elementHeight / 2} width={elementWidth} height={elementHeight} rx={Math.max(Math.min(elementWidth, elementHeight) * 0.15, 2)} transform={`rotate(${element.geometry.rotation ?? 0} ${point.x} ${point.y})`} fill="currentColor" className="text-sky-400" />;
                    })}
                  </svg>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => restore(preview.version)} disabled={pending}><RotateCcw className="mr-2 h-4 w-4" />Restore this version</Button></div>
        </div>
      ) : null}

      <div className="space-y-2">
        {versions.length === 0 ? <p className="text-sm text-muted-foreground">No immutable checkpoints yet.</p> : versions.map((version) => (
          <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex items-start gap-3"><History className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Version {version.versionNumber}</p><p className="text-xs text-muted-foreground">{version.createdAt.toLocaleString()} · {version.reason || "Manual checkpoint"}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{version.snapshotHash.slice(0, 16)}…</p></div></div>
            <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openPreview(version)} disabled={pending}><Eye className="mr-2 h-4 w-4" />Preview</Button><Button type="button" size="sm" variant="outline" onClick={() => restore(version)} disabled={pending}><RotateCcw className="mr-2 h-4 w-4" />Restore</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
