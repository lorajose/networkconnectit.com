import type { ProjectPassPremiumOutputManifest } from "./project-pass-premium-output";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function label(value: string | null | undefined, fallback = "—") {
  const normalized = value?.trim();
  return escapeXml(normalized || fallback);
}

/**
 * Dependency-free, server-side CCTV diagram renderer.
 *
 * The renderer accepts only the canonical manifest loaded by the server after
 * Project Pass authorization. It never accepts SVG, HTML or diagram markup
 * from the browser, preventing client-supplied executable/markup content from
 * crossing the paid artifact boundary.
 */
export function renderProjectPassCctvSvg(manifest: ProjectPassPremiumOutputManifest) {
  if (manifest.product !== "CCTV_DIAGRAM_EXPORT") {
    throw new Error("Unsupported Project Pass premium output product");
  }

  const cameras = manifest.devices.filter((device) => device.type === "CAMERA");
  const infrastructure = manifest.devices.filter((device) => device.type !== "CAMERA");
  const rowHeight = 44;
  const cameraRows = Math.max(cameras.length, 1);
  const infrastructureRows = Math.max(infrastructure.length, 1);
  const height = 310 + (cameraRows + infrastructureRows) * rowHeight;
  const project = manifest.project;
  const site = project.primarySite;

  const rows = (devices: typeof manifest.devices, startY: number) => {
    if (devices.length === 0) {
      return `<text x="70" y="${startY}" font-size="14" fill="#475569">No devices recorded.</text>`;
    }

    return devices
      .map((device, index) => {
        const y = startY + index * rowHeight;
        const details = [device.brand, device.model, device.hostname, device.ipAddress]
          .filter(Boolean)
          .join(" · ");
        return [
          `<rect x="60" y="${y - 24}" width="1080" height="34" rx="7" fill="#f8fafc" stroke="#cbd5e1"/>`,
          `<text x="76" y="${y - 2}" font-size="14" font-weight="600" fill="#0f172a">${label(device.name)}</text>`,
          `<text x="390" y="${y - 2}" font-size="13" fill="#334155">${label(details)}</text>`,
          `<text x="1030" y="${y - 2}" font-size="12" text-anchor="end" fill="#475569">${label(device.status)}</text>`,
        ].join("");
      })
      .join("");
  };

  const cameraStart = 230;
  const infrastructureTitleY = cameraStart + cameraRows * rowHeight + 34;
  const infrastructureStart = infrastructureTitleY + 42;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${label(project.name)} CCTV Project Diagram</title>
  <desc id="desc">Server-generated NetworkConnectIT Project Pass CCTV project artifact.</desc>
  <rect width="1200" height="${height}" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="116" fill="#0f172a"/>
  <text x="60" y="48" font-size="26" font-weight="700" fill="#ffffff">NetworkConnectIT · CCTV Project Diagram</text>
  <text x="60" y="82" font-size="18" fill="#cbd5e1">${label(project.name)}${project.projectCode ? ` · ${label(project.projectCode)}` : ""}</text>
  <text x="1140" y="48" font-size="13" text-anchor="end" fill="#cbd5e1">Project Pass</text>
  <text x="60" y="146" font-size="14" fill="#334155">Site: ${label(site?.name)}</text>
  <text x="60" y="171" font-size="13" fill="#475569">${label(site?.addressLine1)} · ${label(site?.city)} · ${label(site?.stateRegion)} ${label(site?.postalCode, "")}</text>
  <text x="60" y="205" font-size="17" font-weight="700" fill="#0f172a">Cameras (${cameras.length})</text>
  ${rows(cameras, cameraStart)}
  <text x="60" y="${infrastructureTitleY}" font-size="17" font-weight="700" fill="#0f172a">Network &amp; Recording Infrastructure (${infrastructure.length})</text>
  ${rows(infrastructure, infrastructureStart)}
  <text x="60" y="${height - 30}" font-size="11" fill="#64748b">Generated ${label(manifest.generatedAt)} · Server-verified Project Pass output</text>
</svg>`;
}
