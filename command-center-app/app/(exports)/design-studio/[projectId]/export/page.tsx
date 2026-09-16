import { notFound } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { calculateDoriZones } from "@/lib/contractor-os/camera-dori";
import { resolveCameraFov } from "@/lib/contractor-os/camera-fov";
import { designExportPolicy } from "@/lib/contractor-os/design-collaboration-policy";
import { reportIncludesSection, resolveDesignReportProfile, type DesignReportSection } from "@/lib/contractor-os/design-report-profile";
import { getDesignProject, listDesignFloors, loadDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";

type DesignExportPageProps = {
  params: { projectId: string };
  searchParams?: { organizationId?: string; sections?: string; profile?: "client" | "internal" };
};

const REPORT_SECTIONS = new Set<DesignReportSection>(["COVER", "FLOOR_PLANS", "CAMERA_COVERAGE", "BOM", "CABLE_SCHEDULE", "PRICING_SUMMARY"]);
function requestedSections(value?: string): DesignReportSection[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((item) => item.trim().toUpperCase()).filter((item): item is DesignReportSection => REPORT_SECTIONS.has(item as DesignReportSection));
}

export default async function DesignStudioExportPage({ params, searchParams }: DesignExportPageProps) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.organizationId ?? searchParams?.organizationId ?? "";
  if (!organizationId) notFound();

  const actor = { id: user.id ?? undefined, role: user.role, organizationId: user.organizationId };
  const exportPolicy = designExportPolicy(actor, organizationId);
  const project = await getDesignProject(actor, params.projectId, exportPolicy.organizationId);
  if (!project) notFound();

  const internalProfile = searchParams?.profile === "internal";
  const profile = resolveDesignReportProfile({
    clientSafe: !internalProfile,
    includePricing: internalProfile,
    sections: requestedSections(searchParams?.sections),
  });

  const organization = exportPolicy.enforceOrganizationBranding
    ? await prisma.organization.findUnique({
        where: { id: exportPolicy.organizationId },
        select: { name: true, logoUrl: true, brandPrimaryColor: true, brandAccentColor: true, brandTagline: true },
      })
    : null;
  if (exportPolicy.enforceOrganizationBranding && !organization) notFound();

  const floors = await listDesignFloors(actor, params.projectId, exportPolicy.organizationId);
  const floorDocuments = await Promise.all(floors.map(async (floor) => ({ floor, document: await loadDesignFloorCanvas(actor, params.projectId, floor.id, exportPolicy.organizationId) })));
  const cameras = floorDocuments.flatMap(({ floor, document }) => document.elements.flatMap((element) => {
    if (element.kind !== "DEVICE" || !element.cameraFov || !element.cameraDori) return [];
    try {
      const fov = resolveCameraFov(element.cameraFov);
      const zones = calculateDoriZones({ horizontalPixels: element.cameraDori.horizontalPixels, horizontalFovDegrees: fov.horizontalDegrees }, element.cameraDori.thresholds);
      return [{ floorName: floor.name, element, fov, zones }];
    } catch { return []; }
  }));

  const companyName = organization?.name ?? "NetworkConnectIT";
  const tagline = organization?.brandTagline?.trim();

  return (
    <main className="mx-auto max-w-6xl space-y-8 bg-white p-8 text-slate-950 print:max-w-none print:p-0">
      {reportIncludesSection(profile, "COVER") ? <header className="border-b pb-5">
        <div className="flex items-start justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{companyName} Design Report</p><h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>{tagline ? <p className="mt-1 text-sm text-slate-500">{tagline}</p> : null}<p className="mt-2 text-xs text-slate-500">Revision {project.workingRevision} · {profile.clientSafe ? "Client-safe" : "Internal"} profile</p></div>{organization?.logoUrl ? <img src={organization.logoUrl} alt={`${companyName} logo`} className="max-h-16 max-w-48 object-contain" /> : null}</div>
        {organization?.brandPrimaryColor || organization?.brandAccentColor ? <div className="mt-4 flex gap-2">{organization.brandPrimaryColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandPrimaryColor }} /> : null}{organization.brandAccentColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandAccentColor }} /> : null}</div> : null}
      </header> : null}

      {reportIncludesSection(profile, "FLOOR_PLANS") ? <section className="space-y-3"><h2 className="text-xl font-semibold">Floor plans</h2><div className="grid gap-3 sm:grid-cols-2">{floorDocuments.map(({ floor, document }) => <div key={floor.id} className="rounded-xl border p-4"><h3 className="font-semibold">{floor.name}</h3><p className="text-sm text-slate-600">{document.elements.length} design elements · canvas {Number(floor.canvasWidth)} × {Number(floor.canvasHeight)} {floor.scaleUnit}</p></div>)}</div></section> : null}

      {reportIncludesSection(profile, "CAMERA_COVERAGE") ? <section className="space-y-4"><div><h2 className="text-xl font-semibold">Camera coverage</h2><p className="text-sm text-slate-600">DORI & pixel-density coverage · PPM = pixels per meter · PPF = pixels per foot.</p></div>{cameras.length ? cameras.map(({ floorName, element, fov, zones }) => <div key={`${floorName}-${element.id}`} className="break-inside-avoid rounded-xl border p-5"><h3 className="font-semibold">{floorName} · Camera {element.id}</h3><p className="text-xs text-slate-500">Horizontal FOV {fov.horizontalDegrees.toFixed(1)}° · Resolution {element.cameraDori!.horizontalPixels}px</p><table className="mt-3 w-full text-left text-sm"><thead><tr><th>Zone</th><th>PPM</th><th>PPF</th><th>Distance</th></tr></thead><tbody>{zones.map((zone) => <tr key={`${zone.key}-${zone.minimumPpm}`}><td>{zone.label}</td><td>{zone.minimumPpm.toFixed(1)}</td><td>{(zone.minimumPpm / 3.280839895013123).toFixed(1)}</td><td>{zone.distanceMeters.toFixed(1)} m</td></tr>)}</tbody></table></div>) : <p className="rounded-xl border border-dashed p-6 text-sm text-slate-600">No configured camera coverage in this revision.</p>}</section> : null}

      {reportIncludesSection(profile, "BOM") ? <section><h2 className="text-xl font-semibold">Bill of materials</h2><p className="mt-2 text-sm text-slate-600">Design-derived BOM section. Final quantities remain governed by the approved Takeoff/BOM record.</p></section> : null}
      {reportIncludesSection(profile, "CABLE_SCHEDULE") ? <section><h2 className="text-xl font-semibold">Cable schedule</h2><p className="mt-2 text-sm text-slate-600">Cable routes and measured design quantities for this revision.</p></section> : null}
      {reportIncludesSection(profile, "PRICING_SUMMARY") ? <section><h2 className="text-xl font-semibold">Pricing summary</h2><p className="mt-2 text-sm text-slate-600">Internal pricing profile. Pricing is never rendered by a client-safe report profile.</p></section> : null}

      <footer className="border-t pt-4 text-xs text-slate-500">Generated from Design Studio revision {project.workingRevision}. Design evidence is revision-specific; issued-client reports must be preserved as immutable snapshots.</footer>
    </main>
  );
}
