"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw, Save } from "lucide-react";

import { createDesignCheckpointAction, restoreDesignVersionAction } from "@/app/(protected)/design-studio/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DesignVersionSummary } from "@/lib/contractor-os/design-version-repository";

type Props = {
  organizationId: string;
  projectId: string;
  workingRevision: number;
  versions: DesignVersionSummary[];
};

export function DesignVersionHistory({ organizationId, projectId, workingRevision, versions }: Props) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
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
      <div className="space-y-2">
        {versions.length === 0 ? <p className="text-sm text-muted-foreground">No immutable checkpoints yet.</p> : versions.map((version) => (
          <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex items-start gap-3"><History className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Version {version.versionNumber}</p><p className="text-xs text-muted-foreground">{version.createdAt.toLocaleString()} · {version.reason || "Manual checkpoint"}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{version.snapshotHash.slice(0, 16)}…</p></div></div>
            <Button type="button" size="sm" variant="outline" onClick={() => restore(version)} disabled={pending}><RotateCcw className="mr-2 h-4 w-4" />Restore</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
