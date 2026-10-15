"use client";

import { useMemo, useState, useTransition } from "react";

import { createDesignShareAction, revokeDesignShareAction } from "@/app/(protected)/design-studio/actions";
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

type ActiveShare = { id: string; url: string };
type ManagedShare = { id: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; passwordProtected: boolean };

export function DesignReportPanel({
  organizationId,
  projectId,
  initialShares = [],
  layerOptions = [],
}: {
  organizationId: string;
  projectId: string;
  initialShares?: ManagedShare[];
  layerOptions?: Array<{ id: string; name: string }>;
}) {
  const [clientSafe, setClientSafe] = useState(true);
  const base = clientSafe ? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE : DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE;
  const [sections, setSections] = useState<DesignReportSection[]>([...DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>(layerOptions.map((layer) => layer.id));
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [activeShare, setActiveShare] = useState<ActiveShare | null>(null);
  const [managedShares, setManagedShares] = useState<ManagedShare[]>(initialShares);
  const [shareMessage, setShareMessage] = useState("");
  const [isSharing, startSharing] = useTransition();
  const profile = useMemo<DesignReportProfile>(() => ({ ...base, sections: clientSafe ? sections.filter((section) => section !== "PRICING_SUMMARY") : sections, visibleLayerIds, includePricing: !clientSafe && sections.includes("PRICING_SUMMARY"), clientSafe }), [base, clientSafe, sections, visibleLayerIds]);

  function setProfile(nextClientSafe: boolean) {
    setClientSafe(nextClientSafe);
    setSections([...(nextClientSafe ? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections : DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE.sections)]);
    setShareMessage("");
  }

  function toggleSection(section: DesignReportSection) {
    if (clientSafe && section === "PRICING_SUMMARY") return;
    setSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  }

  function toggleLayer(layerId: string) {
    setVisibleLayerIds((current) => current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]);
  }

  function createShare() {
    if (!clientSafe) {
      setShareMessage("Switch to Client-safe before creating a client share.");
      return;
    }
    startSharing(async () => {
      try {
        setShareMessage("");
        const result = await createDesignShareAction({
          organizationId,
          projectId,
          sections: profile.sections,
          visibleLayerIds: profile.visibleLayerIds,
          password: sharePassword || undefined,
          expiresAt: shareExpiresAt ? new Date(shareExpiresAt).toISOString() : null,
        });
        setActiveShare({ id: result.shareId, url: result.url });
        setManagedShares((current) => [{ id: result.shareId, createdAt: new Date().toISOString(), expiresAt: result.expiresAt ? new Date(result.expiresAt).toISOString() : null, revokedAt: null, passwordProtected: Boolean(sharePassword) }, ...current]);
        setShareMessage("Client share created. Copy this link now; the raw token is not stored for later recovery.");
      } catch (error) {
        setShareMessage(error instanceof Error ? error.message : "Unable to create client share.");
      }
    });
  }

  function revokeShare(shareId = activeShare?.id) {
    if (!shareId) return;
    startSharing(async () => {
      try {
        await revokeDesignShareAction({ organizationId, projectId, shareId });
        if (activeShare?.id === shareId) setActiveShare(null);
        setManagedShares((current) => current.map((share) => share.id === shareId ? { ...share, revokedAt: new Date().toISOString() } : share));
        setShareMessage("Client share revoked immediately.");
      } catch (error) {
        setShareMessage(error instanceof Error ? error.message : "Unable to revoke client share.");
      }
    });
  }

  async function copyShareLink() {
    if (!activeShare) return;
    const absoluteUrl = new URL(activeShare.url, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    setShareMessage("Client share link copied.");
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Design report / proposal package</CardTitle><CardDescription>Choose a client-safe or internal profile, the report sections, and the design layers that are allowed into issued evidence. Client-safe mode hard-disables pricing.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={clientSafe} onChange={() => setProfile(true)} />Client-safe</label><label className="flex items-center gap-2"><input type="radio" checked={!clientSafe} onChange={() => setProfile(false)} />Internal</label></div>
        <div><p className="text-sm font-medium">Sections</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(SECTION_LABELS) as DesignReportSection[]).map((section) => <label key={section} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={profile.sections.includes(section)} disabled={clientSafe && section === "PRICING_SUMMARY"} onChange={() => toggleSection(section)} />{SECTION_LABELS[section]}</label>)}</div></div>
        {layerOptions.length ? <div><p className="text-sm font-medium">Included layers</p><div className="mt-2 flex flex-wrap gap-3">{layerOptions.map((layer) => <label key={layer.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleLayerIds.includes(layer.id)} onChange={() => toggleLayer(layer.id)} />{layer.name}</label>)}</div></div> : null}
        <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground"><p>Profile: <span className="font-medium text-foreground">{clientSafe ? "Client-safe" : "Internal"}</span></p><p className="mt-1">Pricing: {profile.includePricing ? "included" : "blocked"} · Sections: {profile.sections.length} · Layers: {profile.visibleLayerIds?.length ?? 0}</p><p className="mt-2">Issuing the package remains a server-authorized operation; this panel prepares the export profile without weakening tenant or export permissions.</p></div>

        <div className="space-y-3 rounded-xl border p-4">
          <div><p className="text-sm font-medium">Secure client share</p><p className="mt-1 text-xs text-muted-foreground">Creates a frozen, read-only client-safe snapshot. Pricing and internal-only details remain blocked.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Optional password<input className="mt-2 block w-full rounded-lg border bg-background px-3 py-2 text-sm" type="password" value={sharePassword} onChange={(event) => setSharePassword(event.target.value)} autoComplete="new-password" disabled={isSharing || !!activeShare} /></label>
            <label className="text-sm font-medium">Optional expiration<input className="mt-2 block w-full rounded-lg border bg-background px-3 py-2 text-sm" type="datetime-local" value={shareExpiresAt} onChange={(event) => setShareExpiresAt(event.target.value)} disabled={isSharing || !!activeShare} /></label>
          </div>
          {activeShare ? <div className="space-y-2 rounded-lg border bg-muted/20 p-3"><p className="break-all text-xs">{activeShare.url}</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-sm font-medium" onClick={copyShareLink} disabled={isSharing}>Copy link</button><button type="button" className="rounded-lg border px-3 py-2 text-sm font-medium" onClick={() => revokeShare()} disabled={isSharing}>{isSharing ? "Revoking…" : "Revoke immediately"}</button></div></div> : <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={createShare} disabled={isSharing || !clientSafe}>{isSharing ? "Creating secure share…" : "Create client share"}</button>}
          {shareMessage ? <p className="text-xs text-muted-foreground" role="status">{shareMessage}</p> : null}
          {managedShares.length ? <div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Existing shares</p>{managedShares.map((share) => { const expired = Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()); const inactive = Boolean(share.revokedAt) || expired; return <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3 text-xs"><div><p className="font-medium text-foreground">{share.id}</p><p className="mt-1 text-muted-foreground">Created {new Date(share.createdAt).toLocaleString()} · {share.passwordProtected ? "Password protected" : "No password"}{share.expiresAt ? ` · Expires ${new Date(share.expiresAt).toLocaleString()}` : ""} · {share.revokedAt ? "Revoked" : expired ? "Expired" : "Active"}</p></div>{inactive ? null : <button type="button" className="rounded-lg border px-3 py-2 text-sm font-medium" onClick={() => revokeShare(share.id)} disabled={isSharing}>Revoke</button>}</div>; })}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
