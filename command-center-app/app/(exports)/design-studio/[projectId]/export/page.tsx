import { notFound } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { calculateDoriZones } from "@/lib/contractor-os/camera-dori";
import { resolveCameraFov } from "@/lib/contractor-os/camera-fov";
import { designExportPolicy } from "@/lib/contractor-os/design-collaboration-policy";
import { getDesignProject, listDesignFloors, loadDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";

type DesignExportPageProps = {
  params: { projectId: string };
  searchParams?: { organizationId?: string };
};

export default async function DesignStudioExportPage({ params, searchParams }: DesignExportPageProps) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.organizationId ?? searchParams?.organizationId ?? "";
  if (!organizationId) notFound();

  const actor = { id: user.id ?? undefined, role: user.role, organizationId: user.organizationId };
  const exportPolicy = designExportPolicy(actor, organizationId);
  const project = await getDesignProject(actor, params.projectId, exportPolicy.organizationId);
  if (!project) notFound();

  const organization = exportPolicy.enforceOrganizationBranding
    ? await prisma.organization.findUnique({
        where: { id: exportPolicy.organizationId },
        select: { name: true, logoUrl: true, brandPrimaryColor: true, brandAccentColor: true, brandTagline: true },
      })
    : null;
  if (exportPolicy.enforceOrganizationBranding && !organization) notFound();

  const floors = await listDesignFloors(actor, params.projectId, exportPolicy.organizationId);
  const floorDocuments = await Promise.all(
    floors.map(async (floor) => ({
      floor,
      document: await loadDesignFloorCanvas(actor, params.projectId, floor.id, exportPolicy.organizationId),
    })),
  );

  const cameras = floorDocuments.flatMap(({ floor, document }) =>
    document.elements.flatMap((element) => {
      if (element.kind !== "DEVICE" || !element.cameraFov || !element.cameraDori) return [];
      try {
        const fov = resolveCameraFov(element.cameraFov);
        const zones = calculateDoriZones(
          { horizontalPixels: element.cameraDori.horizontalPixels, horizontalFovDegrees: fov.horizontalDegrees },
          element.cameraDori.thresholds,
        );
        return [{ floorName: floor.name, element, fov, zones }];
      } catch {
        return [];
      }
    }),
  );

  const companyName = organization?.name ?? "NetworkConnectIT";
  const tagline = organization?.brandTagline?.trim();

  return (
    <main className="mx-auto max-w-6xl space-y-8 bg-white p-8 text-slate-950 print:max-w-none print:p-0">
      <header className="border-b pb-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{companyName} Design Studio Export</p>
            <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
            {tagline ? <p className="mt-1 text-sm text-slate-500">{tagline}</p> : null}
          </div>
          {organization?.logoUrl ? <img src={organization.logoUrl} alt={`${companyName} logo`} className="max-h-16 max-w-48 object-contain" /> : null}
        </div>
        <p className="mt-3 text-sm text-slate-600">DORI & pixel-density coverage legend · PPM = pixels per meter · PPF = pixels per foot</p>
        {organization?.brandPrimaryColor || organization?.brandAccentColor ? (
          <div className="mt-4 flex gap-2" aria-label="Organization brand colors">
            {organization.brandPrimaryColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandPrimaryColor }} /> : null}
            {organization.brandAccentColor ? <span className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: organization.brandAccentColor }} /> : null}
          </div>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Coverage legend</h2>
        <p className="text-sm text-slate-600">Thresholds and standards references are project-configurable. This export reports the configured design criteria and does not represent a legal compliance certification.</p>
      </section>

      {cameras.length ? cameras.map(({ floorName, element, fov, zones }) => (
        <section key={`${floorName}-${element.id}`} className="break-inside-avoid rounded-xl border border-slate-300 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div><h3 className="font-semibold">{floorName} · Camera {element.id}</h3><p className="text-xs text-slate-500">Horizontal FOV {fov.horizontalDegrees.toFixed(1)}° · Resolution {element.cameraDori!.horizontalPixels}px</p></div>
            <p className="text-xs text-slate-500">Inspection distance {element.cameraDori!.inspectionDistanceMeters.toFixed(1)} m</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100"><tr><th className="px-3 py-2">Zone</th><th className="px-3 py-2">Minimum PPM</th><th className="px-3 py-2">Approx. PPF</th><th className="px-3 py-2">Distance</th><th className="px-3 py-2">Reference</th></tr></thead>
              <tbody>{zones.map((zone) => <tr key={`${zone.key}-${zone.minimumPpm}`} className="border-t border-slate-200"><td className="px-3 py-2 font-medium">{zone.label}</td><td className="px-3 py-2">{zone.minimumPpm.toFixed(1)} PPM</td><td className="px-3 py-2">{(zone.minimumPpm / 3.280839895013123).toFixed(1)} PPF</td><td className="px-3 py-2">{zone.distanceMeters.toFixed(1)} m / {zone.distanceFeet.toFixed(1)} ft</td><td className="px-3 py-2">{zone.standardReference || "User-defined"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No cameras with DORI configuration are present in this design revision.</p>}
    </main>
  );
}
