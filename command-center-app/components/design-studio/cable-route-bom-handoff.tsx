"use client";

import { Button } from "@/components/ui/button";
import {
  createCableRouteBomCandidate,
  routeFromGeometry,
  type CableRouteBomCandidate,
  type CableRouteSettings,
} from "@/lib/contractor-os/cable-route";
import type { DesignPoint } from "@/lib/contractor-os/design-studio";

type CableRouteBomHandoffProps = {
  id: string;
  points: DesignPoint[];
  settings: CableRouteSettings;
  designUnitsPerMeter: number;
  onPrepare: (candidate: CableRouteBomCandidate) => void;
};

export function CableRouteBomHandoff({ id, points, settings, designUnitsPerMeter, onPrepare }: CableRouteBomHandoffProps) {
  const calibrated = Number.isFinite(designUnitsPerMeter) && designUnitsPerMeter > 0;

  function prepare() {
    if (!calibrated) return;
    const route = routeFromGeometry(id, points, settings);
    onPrepare(createCableRouteBomCandidate(route, 1 / designUnitsPerMeter));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-3">
      <div>
        <p className="text-sm font-medium">Takeoff / BOM handoff</p>
        <p className="text-xs text-muted-foreground">Creates a proposal only. Quantities are not committed until a person approves them.</p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={!calibrated} onClick={prepare}>
        Prepare BOM proposal
      </Button>
    </div>
  );
}
