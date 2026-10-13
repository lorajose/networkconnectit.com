"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Candidate = { formattedAddress: string; latitude: number; longitude: number; score: number };
type ConfirmedLocation = { siteId: string; formattedAddress: string; latitude: number; longitude: number };
type Basemap = { provider: "arcgis"; style: "arcgis/imagery"; attributionRequired: true; attributionText: string };

export function AerialSitePanel({ organizationId, siteId, initialLocation }: { organizationId: string; siteId: string; initialLocation?: ConfirmedLocation | null }) {
  const [query, setQuery] = useState(initialLocation?.formattedAddress ?? "");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(initialLocation ? { ...initialLocation, score: 100 } : null);
  const [confirmed, setConfirmed] = useState<ConfirmedLocation | null>(initialLocation ?? null);
  const [basemap, setBasemap] = useState<Basemap | null>(initialLocation ? { provider: "arcgis", style: "arcgis/imagery", attributionRequired: true, attributionText: "Powered by Esri; data attribution is embedded in the aerial image." } : null);
  const [zoom, setZoom] = useState(19);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function searchAddress() {
    if (query.trim().length < 4) return;
    setBusy(true); setMessage(null); setCandidates([]);
    try {
      const response = await fetch(`/api/design-studio/aerial-site?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const body = await response.json() as { candidates?: Candidate[]; basemap?: Basemap; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to search address");
      setCandidates(body.candidates ?? []); setBasemap(body.basemap ?? null);
      setMessage((body.candidates?.length ?? 0) ? "Select the intended site before saving." : "No matching site locations were found.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to search address"); }
    finally { setBusy(false); }
  }

  async function confirmLocation() {
    if (!selected) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/design-studio/aerial-site", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, siteId, formattedAddress: selected.formattedAddress, latitude: selected.latitude, longitude: selected.longitude }),
      });
      const body = await response.json() as { location?: ConfirmedLocation; error?: string };
      if (!response.ok || !body.location) throw new Error(body.error || "Unable to confirm site location");
      setConfirmed(body.location); setMessage("Site location confirmed. Aerial imagery remains a licensed reference layer; field measurements/calibration stay authoritative.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to confirm site location"); }
    finally { setBusy(false); }
  }

  const preview = confirmed ? `/api/design-studio/aerial-site/image?latitude=${encodeURIComponent(confirmed.latitude)}&longitude=${encodeURIComponent(confirmed.longitude)}&zoom=${zoom}` : null;

  return <div className="space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter the complete site address" /><Button type="button" onClick={searchAddress} disabled={busy || query.trim().length < 4}>{busy ? "Working…" : "Find aerial site"}</Button></div>
    {candidates.length ? <div className="space-y-2">{candidates.map((candidate) => <button type="button" key={`${candidate.latitude}:${candidate.longitude}`} onClick={() => setSelected(candidate)} className={`block w-full rounded-xl border p-3 text-left text-sm ${selected?.latitude === candidate.latitude && selected?.longitude === candidate.longitude ? "border-primary bg-primary/5" : "bg-muted/20"}`}><span className="font-medium">{candidate.formattedAddress}</span><span className="mt-1 block text-xs text-muted-foreground">{candidate.latitude.toFixed(6)}, {candidate.longitude.toFixed(6)} · match {Math.round(candidate.score)}%</span></button>)}</div> : null}
    {selected ? <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"><div className="min-w-0 flex-1"><p className="font-medium">Selected site</p><p className="truncate text-xs text-muted-foreground">{selected.formattedAddress} · {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</p></div><Button type="button" variant="outline" onClick={confirmLocation} disabled={busy}>Confirm location</Button></div> : null}
    {confirmed ? <div className="rounded-xl border bg-muted/20 p-3 text-sm"><p className="font-medium">Confirmed aerial anchor</p><p className="mt-1 text-xs text-muted-foreground">{confirmed.formattedAddress} · {confirmed.latitude.toFixed(6)}, {confirmed.longitude.toFixed(6)}</p><p className="mt-2 text-xs text-muted-foreground">Orientation and measurement scale are controlled by Design Studio calibration. Device/camera geometry is placed on the existing calibrated canvas.</p></div> : null}
    {preview ? <div className="overflow-hidden rounded-xl border bg-muted/20"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><div><p className="text-sm font-medium">ArcGIS aerial reference</p><p className="text-xs text-muted-foreground">Provider image is proxied through the authenticated server route; the ArcGIS credential is never exposed to the browser.</p></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setZoom((value) => Math.max(16, value - 1))} disabled={zoom <= 16}>−</Button><span className="min-w-16 text-center text-xs">Zoom {zoom}</span><Button type="button" size="sm" variant="outline" onClick={() => setZoom((value) => Math.min(22, value + 1))} disabled={zoom >= 22}>+</Button></div></div><img key={preview} src={preview} alt={`Aerial reference for ${confirmed?.formattedAddress ?? "confirmed site"}`} className="block h-auto w-full" /><div className="border-t px-3 py-2 text-xs text-muted-foreground" data-provider-attribution="arcgis">Powered by Esri. Full data attribution is embedded in the map image by the ArcGIS Static Maps service.</div></div> : null}
    {basemap?.attributionRequired ? <p className="text-xs font-medium text-muted-foreground" data-provider-attribution="arcgis">{basemap.attributionText}</p> : null}
    {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
  </div>;
}
