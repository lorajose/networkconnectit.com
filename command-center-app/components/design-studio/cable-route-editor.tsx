"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CABLE_ROUTE_TYPES,
  type CableRouteSettings,
  type CableRouteType,
} from "@/lib/contractor-os/cable-route";

type CableRouteEditorProps = {
  value: CableRouteSettings;
  onChange: (next: CableRouteSettings) => void;
  measurement?: { totalMeters: number; totalFeet: number } | null;
};

function numeric(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CableRouteEditor({ value, onChange, measurement }: CableRouteEditorProps) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Cable route</h3>
          <p className="text-xs text-muted-foreground">Measured from the calibrated floor-plan scale plus field allowances.</p>
        </div>
        {measurement ? (
          <div className="text-right text-xs">
            <div className="font-medium">{measurement.totalFeet.toFixed(1)} ft</div>
            <div className="text-muted-foreground">{measurement.totalMeters.toFixed(2)} m total</div>
          </div>
        ) : <span className="text-xs text-amber-500">Calibrate floor scale to calculate length.</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="route-cable-type">Cable type</Label>
          <select
            id="route-cable-type"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={value.cableType}
            onChange={(event) => onChange({ ...value, cableType: event.target.value as CableRouteType })}
          >
            {CABLE_ROUTE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {value.cableType === "CUSTOM" ? (
          <div className="space-y-1">
            <Label htmlFor="route-custom-type">Custom cable</Label>
            <Input id="route-custom-type" value={value.customCableType ?? ""} onChange={(event) => onChange({ ...value, customCableType: event.target.value })} placeholder="e.g. 18/2 Shielded" />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="route-rise">Vertical rise (m)</Label>
          <Input id="route-rise" type="number" min="0" step="0.1" value={value.factors.verticalRiseMeters} onChange={(event) => onChange({ ...value, factors: { ...value.factors, verticalRiseMeters: numeric(event.target.value, value.factors.verticalRiseMeters) } })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="route-loop">Service loop (m)</Label>
          <Input id="route-loop" type="number" min="0" step="0.1" value={value.factors.serviceLoopMeters} onChange={(event) => onChange({ ...value, factors: { ...value.factors, serviceLoopMeters: numeric(event.target.value, value.factors.serviceLoopMeters) } })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="route-waste">Waste (%)</Label>
          <Input id="route-waste" type="number" min="0" step="1" value={value.factors.wastePercent} onChange={(event) => onChange({ ...value, factors: { ...value.factors, wastePercent: numeric(event.target.value, value.factors.wastePercent) } })} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Takeoff/BOM handoff is generated as a proposal and requires explicit human approval before quantities are committed.</p>
    </section>
  );
}
