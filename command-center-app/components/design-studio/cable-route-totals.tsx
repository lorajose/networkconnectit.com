"use client";

import {
  routeFromGeometry,
  totalCableRoutes,
  type CableRouteSettings,
} from "@/lib/contractor-os/cable-route";
import type { DesignPoint } from "@/lib/contractor-os/design-studio";

type CableRouteTotalsProps = {
  routes: Array<{ id: string; points: DesignPoint[]; settings: CableRouteSettings }>;
  designUnitsPerMeter: number;
};

export function CableRouteTotals({ routes, designUnitsPerMeter }: CableRouteTotalsProps) {
  if (!routes.length) return null;
  if (!Number.isFinite(designUnitsPerMeter) || designUnitsPerMeter <= 0) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Cable totals</h3>
        <p className="mt-1 text-xs text-amber-500">Calibrate the floor scale to calculate cable quantities.</p>
      </section>
    );
  }

  const metersPerDesignUnit = 1 / designUnitsPerMeter;
  const totals = totalCableRoutes(
    routes.map((route) => routeFromGeometry(route.id, route.points, route.settings)),
    metersPerDesignUnit,
  );

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Cable totals</h3>
        <p className="text-xs text-muted-foreground">Automatic measured totals by cable type from the calibrated plan.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4">Cable</th>
              <th className="py-2 pr-4">Routes</th>
              <th className="py-2 pr-4">Feet</th>
              <th className="py-2">Meters</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.cableType} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{total.cableType}</td>
                <td className="py-2 pr-4">{total.routeCount}</td>
                <td className="py-2 pr-4">{total.totalFeet.toFixed(1)}</td>
                <td className="py-2">{total.totalMeters.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Takeoff/BOM remains a proposed handoff and requires explicit human approval.</p>
    </section>
  );
}
