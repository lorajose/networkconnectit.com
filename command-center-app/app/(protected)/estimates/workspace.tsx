"use client";

import { useMemo, useState } from "react";
import { calculateCableQuantity, calculateEstimate, calculateLaborHours, type CostLineInput } from "@/lib/contractor-os/cost-engine";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function EstimateWorkspace() {
  const [cameraCount, setCameraCount] = useState(8);
  const [avgRunFeet, setAvgRunFeet] = useState(150);
  const [cameraCost, setCameraCost] = useState(145);
  const [nvrCost, setNvrCost] = useState(650);
  const [laborRate, setLaborRate] = useState(55);
  const [hoursPerRun, setHoursPerRun] = useState(2.25);
  const [fixedHours, setFixedHours] = useState(6);
  const [markup, setMarkup] = useState(35);
  const [laborBurden, setLaborBurden] = useState(18);
  const [contingency, setContingency] = useState(5);
  const [tax, setTax] = useState(8.625);
  const [cableCostPerFoot, setCableCostPerFoot] = useState(0.22);
  const [travelCost, setTravelCost] = useState(85);
  const [consumables, setConsumables] = useState(120);

  const cableFeet = calculateCableQuantity(cameraCount, avgRunFeet, 10);
  const laborHours = calculateLaborHours(cameraCount, hoursPerRun, fixedHours);

  const lines = useMemo<CostLineInput[]>(() => [
    { type: "MATERIAL", description: "4K IP Camera", quantity: cameraCount, unitCost: cameraCost, taxable: true, unit: "ea" },
    { type: "MATERIAL", description: "NVR / Recorder", quantity: 1, unitCost: nvrCost, taxable: true, unit: "ea" },
    { type: "MATERIAL", description: "Cat6 Cable", quantity: cableFeet, unitCost: cableCostPerFoot, taxable: true, unit: "ft" },
    { type: "LABOR", description: "Installation & commissioning labor", quantity: laborHours, unitCost: laborRate, taxable: false, unit: "hr" },
    { type: "TRAVEL", description: "Travel / mobilization", quantity: 1, unitCost: travelCost, taxable: false, unit: "job" },
    { type: "CONSUMABLE", description: "Connectors, fasteners, labels & misc.", quantity: 1, unitCost: consumables, taxable: true, unit: "job" },
  ], [cameraCount, cameraCost, nvrCost, cableFeet, cableCostPerFoot, laborHours, laborRate, travelCost, consumables]);

  const totals = calculateEstimate({
    lines,
    markupPercent: markup,
    taxPercent: tax,
    laborBurdenPercent: laborBurden,
    contingencyPercent: contingency,
  });

  const fields = [
    ["Cameras", cameraCount, setCameraCount],
    ["Avg. cable run (ft)", avgRunFeet, setAvgRunFeet],
    ["Camera unit cost", cameraCost, setCameraCost],
    ["NVR cost", nvrCost, setNvrCost],
    ["Labor cost / hr", laborRate, setLaborRate],
    ["Hours per camera/run", hoursPerRun, setHoursPerRun],
    ["Fixed project hours", fixedHours, setFixedHours],
    ["Cable cost / ft", cableCostPerFoot, setCableCostPerFoot],
    ["Travel cost", travelCost, setTravelCost],
    ["Consumables", consumables, setConsumables],
    ["Markup %", markup, setMarkup],
    ["Labor burden %", laborBurden, setLaborBurden],
    ["Contingency %", contingency, setContingency],
    ["Sales tax %", tax, setTax],
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">CCTV Job Inputs</h2>
            <p className="text-sm text-slate-500">Start from a real installation instead of a blank spreadsheet.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live pricing</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value, setter]) => (
            <label key={label} className="space-y-1 text-sm font-medium text-slate-700">
              <span>{label}</span>
              <input
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(event) => setter(numberValue(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring-2"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Cable with 10% waste" value={`${cableFeet.toLocaleString()} ft`} />
          <Metric label="Estimated labor" value={`${laborHours} hrs`} />
          <Metric label="Crew days @ 16 hrs/day" value={`${Math.max(1, Math.ceil(laborHours / 16))}`} />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3 text-right">Ext. cost</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.description}>
                  <td className="px-4 py-3"><div className="font-medium">{line.description}</div><div className="text-xs text-slate-400">{line.type}</div></td>
                  <td className="px-4 py-3">{line.quantity.toLocaleString()} {line.unit}</td>
                  <td className="px-4 py-3">{currency.format(line.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-medium">{currency.format(line.quantity * line.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Job economics</p>
          <div className="mt-3 text-4xl font-bold">{currency.format(totals.total)}</div>
          <p className="mt-1 text-sm text-slate-400">Estimated customer total including tax</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <DarkMetric label="Real direct cost" value={currency.format(totals.directCost)} />
            <DarkMetric label="Gross profit" value={currency.format(totals.grossProfit)} />
            <DarkMetric label="Gross margin" value={`${totals.marginPercent}%`} />
            <DarkMetric label="Sell subtotal" value={currency.format(totals.sellSubtotal)} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Cost protection</h3>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Materials" value={currency.format(totals.materialCost)} />
            <Row label="Labor wages" value={currency.format(totals.laborCost)} />
            <Row label="Labor burden" value={currency.format(totals.laborBurden)} />
            <Row label="Travel" value={currency.format(totals.travelCost)} />
            <Row label="Consumables" value={currency.format(totals.consumableCost)} />
            <Row label="Contingency" value={currency.format(totals.contingencyCost)} />
            <Row label="Tax collected" value={currency.format(totals.taxAmount)} />
          </div>
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Why this matters:</strong> labor burden, waste, mobilization and contingency are visible costs instead of hidden margin leaks.
          </div>
        </section>

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="font-semibold text-sky-950">Next commercial step</h3>
          <p className="mt-2 text-sm text-sky-900">This deterministic estimate will feed Proposal Builder, customer approval and invoicing. AI may help write scope language, but never invent the arithmetic.</p>
        </section>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-600">{label}</span><strong>{value}</strong></div>;
}
