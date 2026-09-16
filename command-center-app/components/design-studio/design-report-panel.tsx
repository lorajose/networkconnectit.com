"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE, type DesignReportProfile, type DesignReportSection } from "@/lib/contractor-os/design-report-profile";

const SECTION_LABELS: Record<DesignReportSection, string> = {
  COVER: "Cover",
  FLOOR_PLANS: "Floor plans",
  CAMERA_COVERAGE: "Camera coverage",
  BOM: "Bill of materials",
  CABLE_SCHEDULE: "Cable schedule",
  PRICING_SUMMARY: "Pricing summary",
};

export function DesignReportPanel({ layerOptions = [] }: { layerOptions?: Array<{ id: string; name: string }> }) {
  const [clientSafe, setClientSafe] = useState(true);
  const base = clientSafe ? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE : DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE;
  const [sections, setSections] = useState<DesignReportSection[]>([...DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>(layerOptions.map((layer) => layer.id));
  const profile = useMemo<DesignReportProfile>(() => ({ ...base, sections: clientSafe ? sections.filter((section) => section !== "PRICING_SUMMARY") : sections, visibleLayerIds, includePricing: !clientSafe && sections.includes("PRICING_SUMMARY"), clientSafe }), [base, clientSafe, sections, visibleLayerIds]);

  function setProfile(nextClientSafe: boolean) {
    setClientSafe(nextClientSafe);
    setSections([...(nextClientSafe ? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections : DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE.sections)]);
  }

  function toggleSection(section: DesignReportSection) {
    if (clientSafe && section === "PRICING_SUMMARY") return;
    setSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  }

  function toggleLayer(layerId: string) {
    setVisibleLayerIds((current) => current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Design report / proposal package</CardTitle><CardDescription>Choose a client-safe or internal profile, the report sections, and the design layers that are allowed into issued evidence. Client-safe mode hard-disables pricing.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={clientSafe} onChange={() => setProfile(true)} />Client-safe</label><label className="flex items-center gap-2"><input type="radio" checked={!clientSafe} onChange={() => setProfile(false)} />Internal</label></div>
        <div><p className="text-sm font-medium">Sections</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(SECTION_LABELS) as DesignReportSection[]).map((section) => <label key={section} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={profile.sections.includes(section)} disabled={clientSafe && section === "PRICING_SUMMARY"} onChange={() => toggleSection(section)} />{SECTION_LABELS[section]}</label>)}</div></div>
        {layerOptions.length ? <div><p className="text-sm font-medium">Included layers</p><div className="mt-2 flex flex-wrap gap-3">{layerOptions.map((layer) => <label key={layer.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleLayerIds.includes(layer.id)} onChange={() => toggleLayer(layer.id)} />{layer.name}</label>)}</div></div> : null}
        <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground"><p>Profile: <span className="font-medium text-foreground">{clientSafe ? "Client-safe" : "Internal"}</span></p><p className="mt-1">Pricing: {profile.includePricing ? "included" : "blocked"} · Sections: {profile.sections.length} · Layers: {profile.visibleLayerIds?.length ?? 0}</p><p className="mt-2">Issuing the package remains a server-authorized operation; this panel prepares the export profile without weakening tenant or export permissions.</p></div>
      </CardContent>
    </Card>
  );
}
