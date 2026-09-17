import { notFound } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { calculateDoriZones } from "@/lib/contractor-os/camera-dori";
import { resolveCameraFov } from "@/lib/contractor-os/camera-fov";
import { designExportPolicy } from "@/lib/contractor-os/design-collaboration-policy";
import { buildDesignReportModel } from "@/lib/contractor-os/design-report-model";
import { resolveDesignReportProfile } from "@/lib/contractor-os/design-report-profile";
import { assertDesignLengthUnit, metersPerDesignUnit } from "@/lib/contractor-os/design-scale";
import { getDesignProject, listDesignFloors, loadDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";

type DesignExportPageProps = { params: { projectId: string }; searchParams?: { organizationId?: string; profile?: string; layers?: string } };

export default async function DesignStudioExportPage({ params, searchParams }: DesignExportPageProps) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.organizationId ?? searchParams?.organizationId ?? "";
  if (!organizationId) notFound();
  const actor = { id: user.id ?? undefined, role: user.role, organizationId: user.organizationId };
  const exportPolicy = designExportPolicy(actor, organizationId);
  const project = await getDesignProject(actor, params.projectId, exportPolicy.organizationId);
  if (!project) notFound();
  const organization = exportPolicy.enforceOrganizationBranding ? await prisma.organization.findUnique({ where: { id: exportPolicy.organizationId }, select: { name: true, logoUrl: true, brandPrimaryColor: true, brandAccentColor: true, brandTagline: true } }) : null;
  if (exportPolicy.enforceOrganizationBranding && !organization) notFound();

  const floors = await listDesignFloors(actor, params.projectId, exportPolicy.organizationId);
  const floorDocuments = await Promise.all(floors.map(async (floor) => ({ floor, document: await loadDesignFloorCanvas(actor, params.projectId, floor.id, exportPolicy.organizationId) })));
  const requestedInternal = searchParams?.profile === "internal";
  const visibleLayerIds = searchParams?.layers?.split(",").map((id) => id.trim()).filter(Boolean);
  const profile = resolveDesignReportProfile({ clientSafe: !requestedInternal, includePricing: requestedInternal, visibleLayerIds });
  const calibratedScales = floorDocuments.map(({ floor }) => {
    if (!floor.realUnitsPerDesignUnit) return undefined;
    assertDesignLengthUnit(floor.scaleUnit);
    return metersPerDesignUnit(Number(floor.realUnitsPerDesignUnit), floor.scaleUnit);
  });
  const commonScale = calibratedScales.length && calibratedScales.every((scale) => scale && scale === calibratedScales[0]) ? calibratedScales[0] : undefined;
  const report = buildDesignReportModel(floorDocuments.map(({ floor, document }) => ({ id: floor.id, name: floor.name, document })), profile, commonScale);

  const includedLayers = profile.visibleLayerIds?.length ? new Set(profile.visibleLayerIds) : null;
  const cameras = floorDocuments.flatMap(({ floor, document }) => document.elements.flatMap((element) => {
    if (element.kind !== "DEVICE" || !element.cameraFov || !element.cameraDori || element.hidden || (includedLayers && element.layerId && !includedLayers.has(element.layerId))) return [];
    try { const fov = resolveCameraFov(element.cameraFov); const zones = calculateDoriZones({ horizontalPixels: element.cameraDori.horizontalPixels, horizontalFovDegrees: fov.horizontalDegrees }, element.cameraDori.thresholds); return [{ floorName: floor.name, element, fov, zones }]; } catch { return []; }
  }));
  const companyName = organization?.name ?? "NetworkConnectIT";
  const tagline = organization?.brandTagline?.trim();

  return <main className="mx-auto max-w-6xl space-y-8 bg-white p-8 text-slate-950 print:max-w-none print:p-0">
    <header className="border-b pb-5"><div className="flex items-start justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{companyName} Design Studio {profile.clientSafe ? "Client Report" : "Internal Report"}</p><h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>{tagline ? <p className="mt-1 text-sm text-slate-500">{tagline}</p> : null}</div>{organization?.logoUrl ? <img src={organization.logoUrl} alt={`${companyName} logo`} className="max-h-16 max-w-48 object-contain" /> : null}</div>{organization?.brandPrimaryColor || organization?.brandAccentColor ? <div className="mt-4 flex gap-2" aria-label="Organization brand colors">{organization.brandPrimaryColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandPrimaryColor }} /> : null}{organization.brandAccentColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandAccentColor }} /> : null}</div> : null}</header>

    {report.warnings.length ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{report.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}
    {profile.sections.includes("FLOOR_PLANS") ? <section className="space-y-3"><h2 className="text-xl font-semibold">Floor plan summary</h2><div className="overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Floor</th><th className="px-3 py-2">Elements</th><th className="px-3 py-2">Devices</th><th className="px-3 py-2">Cable paths</th></tr></thead><tbody>{report.floors.map((floor) => <tr key={floor.id} className="border-t"><td className="px-3 py-2 font-medium">{floor.name}</td><td className="px-3 py-2">{floor.elementCount}</td><td className="px-3 py-2">{floor.deviceCount}</td><td className="px-3 py-2">{floor.cablePathCount}</td></tr>)}</tbody></table></div></section> : null}
    {profile.sections.includes("CAMERA_COVERAGE") ? <section className="space-y-3"><h2 className="text-xl font-semibold">Camera coverage</h2><p className="text-sm text-slate-600">DORI thresholds are project-configurable and are not a legal compliance certification.</p>{cameras.length ? cameras.map(({ floorName, element, fov, zones }) => <div key={`${floorName}-${element.id}`} className="break-inside-avoid rounded-xl border border-slate-300 p-5"><h3 className="font-semibold">{floorName} · Camera {element.id}</h3><p className="text-xs text-slate-500">Horizontal FOV {fov.horizontalDegrees.toFixed(1)}° · Resolution {element.cameraDori!.horizontalPixels}px</p><div className="mt-4 overflow-hidden rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Zone</th><th className="px-3 py-2">Minimum PPM</th><th className="px-3 py-2">Distance</th><th className="px-3 py-2">Reference</th></tr></thead><tbody>{zones.map((zone) => <tr key={`${zone.key}-${zone.minimumPpm}`} className="border-t"><td className="px-3 py-2">{zone.label}</td><td className="px-3 py-2">{zone.minimumPpm.toFixed(1)}</td><td className="px-3 py-2">{zone.distanceFeet.toFixed(1)} ft</td><td className="px-3 py-2">{zone.standardReference || "User-defined"}</td></tr>)}</tbody></table></div></div>) : <p className="rounded-xl border border-dashed p-6 text-sm text-slate-600">No configured camera coverage evidence.</p>}</section> : null}
    {profile.sections.includes("BOM") ? <section className="space-y-3"><h2 className="text-xl font-semibold">Bill of materials</h2><div className="overflow-hidden rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th></tr></thead><tbody>{report.bom.map((item) => <tr key={item.key} className="border-t"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2">{item.unit}</td></tr>)}</tbody></table></div></section> : null}
    {profile.sections.includes("CABLE_SCHEDULE") ? <section className="space-y-3"><h2 className="text-xl font-semibold">Cable schedule</h2>{report.cableSchedule.length ? <div className="overflow-hidden rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Cable</th><th className="px-3 py-2">Length</th></tr></thead><tbody>{report.cableSchedule.map((item) => <tr key={item.key} className="border-t"><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2">{item.quantityFeet.toFixed(1)} ft</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-600">No calibrated cable schedule available.</p>}</section> : null}
    {report.pricingVisible ? <section className="rounded-xl border border-slate-300 p-5"><h2 className="text-xl font-semibold">Pricing summary</h2><p className="mt-2 text-sm text-slate-600">Internal pricing is enabled for this profile. Commercial totals remain governed by the Estimate/Proposal pricing authority.</p></section> : null}
  </main>;
}
