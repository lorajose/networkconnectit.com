"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DesignLayer } from "@/lib/contractor-os/design-layers";

type Props = { layers: DesignLayer[]; onChange: (layers: DesignLayer[]) => void };

const normalizeOrder = (layers: DesignLayer[]) => layers.map((layer, order) => ({ ...layer, order }));

export function DesignLayerManager({ layers, onChange }: Props) {
  const orderedLayers = [...layers].sort((a, b) => a.order - b.order);
  const patch = (id: string, values: Partial<DesignLayer>) =>
    onChange(layers.map((layer) => layer.id === id ? { ...layer, ...values } : layer));

  function addCustom() {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `custom-${crypto.randomUUID()}`
      : `custom-${Date.now()}`;
    onChange([...layers, { id, name: "Custom Layer", order: layers.length, visible: true, locked: false, builtIn: false }]);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= orderedLayers.length) return;
    const next = [...orderedLayers];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalizeOrder(next));
  }

  return (
    <section className="rounded-xl border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Design Layers</h3>
          <p className="text-xs text-muted-foreground">CCTV, access, intrusion, network and pathways share one plan.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addCustom}>
          <Plus className="mr-1 h-3.5 w-3.5" />Custom
        </Button>
      </div>
      <div className="space-y-2">
        {orderedLayers.map((layer, index) => (
          <div key={layer.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2">
            <Button type="button" size="sm" variant="ghost" aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} onClick={() => patch(layer.id, { visible: !layer.visible })}>
              {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} onClick={() => patch(layer.id, { locked: !layer.locked })}>
              {layer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
            {!layer.builtIn ? (
              <input aria-label={`Rename ${layer.name}`} className="min-w-36 flex-1 rounded-md border bg-background px-2 py-1 text-sm" value={layer.name} onChange={(event) => patch(layer.id, { name: event.target.value })} />
            ) : (
              <span className="min-w-36 flex-1 text-sm font-medium">{layer.name}</span>
            )}
            <span className="text-[10px] uppercase text-muted-foreground">{layer.discipline ?? "CUSTOM"}</span>
            <Button type="button" size="sm" variant="ghost" aria-label={`Move ${layer.name} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
            <Button type="button" size="sm" variant="ghost" aria-label={`Move ${layer.name} down`} disabled={index === orderedLayers.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}
