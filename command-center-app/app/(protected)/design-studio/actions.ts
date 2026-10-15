"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { persistFloorPlanAssetAndAttach } from "@/lib/contractor-os/design-asset-repository";
import type { CanvasDocument } from "@/lib/contractor-os/design-canvas-state";
import { designFloorPlanStorageKey, validateDesignFloorPlanUpload } from "@/lib/contractor-os/design-floor-plan";
import { updateDesignFloorBackgroundSettings, updateDesignFloorPdfPage } from "@/lib/contractor-os/design-floor-background-repository";
import { issueDesignReport, verifyIssuedDesignReport } from "@/lib/contractor-os/design-report-issuance";
import { buildDesignReportModel } from "@/lib/contractor-os/design-report-model";
import { DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, resolveDesignReportProfile, type DesignReportSection } from "@/lib/contractor-os/design-report-profile";
import { updateDesignFloorScale } from "@/lib/contractor-os/design-scale-repository";
import { assertDesignLengthUnit, metersPerDesignUnit } from "@/lib/contractor-os/design-scale";
import { createDesignShare, revokeDesignShare } from "@/lib/contractor-os/design-share-link";
import { mysqlDesignShareRepository } from "@/lib/contractor-os/design-share-repository";
import { createDesignFloor, createDesignProject, getDesignProject, listDesignFloors, loadDesignFloorCanvas, saveDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { createDesignVersionCheckpoint, getDesignVersionSnapshot, restoreDesignVersion } from "@/lib/contractor-os/design-version-repository";
import { deletePrivateDesignAsset, storePrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { requireSubscriptionFeatureForActor } from "@/lib/contractor-os/subscription-access-repository";
import { routeAccess } from "@/lib/rbac";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdvancedDesignStudio(
  user: { role: Parameters<typeof requireSubscriptionFeatureForActor>[0]["role"]; organizationId?: string | null },
  organizationId: string
) {
  await requireSubscriptionFeatureForActor(
    { role: user.role, organizationId: user.organizationId },
    "ADVANCED_DESIGN_STUDIO",
    organizationId
  );
}

function actorFor(user: { id: string; role: string; organizationId?: string | null }) {
  return { role: user.role as "SUPER_ADMIN" | "INTERNAL_ADMIN" | "CLIENT_ADMIN" | "VIEWER", organizationId: user.organizationId, id: user.id };
}

function organizationFor(user: { role: string; organizationId?: string | null }, requestedOrganizationId: string) {
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  return organizationId;
}

const SHAREABLE_SECTIONS = new Set<DesignReportSection>(DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections);
function shareSections(input?: readonly DesignReportSection[]) {
  const sections = input?.length ? input : DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections;
  if (sections.some((section) => !SHAREABLE_SECTIONS.has(section))) throw new Error("Design shares cannot include pricing or internal-only sections");
  return [...new Set(sections)];
}

export async function createDesignShareAction(input: {
  organizationId: string;
  projectId: string;
  sections?: readonly DesignReportSection[];
  visibleLayerIds?: readonly string[];
  password?: string;
  expiresAt?: string | null;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = organizationFor(user, input.organizationId);
  await requireAdvancedDesignStudio(user, organizationId);
  const actor = actorFor(user);
  const project = await getDesignProject(actor, input.projectId, organizationId);
  if (!project) throw new Error("Design project not found");

  const floors = await listDesignFloors(actor, project.id, organizationId);
  const sources = await Promise.all(floors.map(async (floor) => ({
    id: floor.id,
    name: floor.name,
    document: await loadDesignFloorCanvas(actor, project.id, floor.id, organizationId),
  })));
  const profile = resolveDesignReportProfile({
    clientSafe: true,
    includePricing: false,
    sections: shareSections(input.sections),
    visibleLayerIds: input.visibleLayerIds?.map((id) => id.trim()).filter(Boolean),
  });
  const calibratedScales = floors
    .map((floor) => {
      if (floor.realUnitsPerDesignUnit === null) return null;
      assertDesignLengthUnit(floor.scaleUnit);
      return metersPerDesignUnit(Number(floor.realUnitsPerDesignUnit), floor.scaleUnit);
    })
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const commonScale = calibratedScales.length === floors.length && new Set(calibratedScales.map(String)).size === 1
    ? calibratedScales[0]
    : undefined;
  const model = buildDesignReportModel(sources, profile, commonScale);
  const report = issueDesignReport({
    issuedByUserId: user.id,
    projectId: project.id,
    organizationId,
    profile,
    model,
    commercialLink: {},
  });
  if (!verifyIssuedDesignReport(report)) throw new Error("Generated client-safe report failed integrity verification");

  const expiresAt = input.expiresAt?.trim() ? new Date(input.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Share expiration is invalid");
  const created = await createDesignShare({
    repository: mysqlDesignShareRepository,
    report,
    profile,
    password: input.password,
    expiresAt,
  });
  revalidatePath(`/design-studio/${project.id}`);
  return { ...created, url: `/share/design/${created.token}` };
}

export async function revokeDesignShareAction(input: { organizationId: string; projectId: string; shareId: string }) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = organizationFor(user, input.organizationId);
  await requireAdvancedDesignStudio(user, organizationId);
  const project = await getDesignProject(actorFor(user), input.projectId, organizationId);
  if (!project) throw new Error("Design project not found");
  const revoked = await revokeDesignShare({ repository: mysqlDesignShareRepository, shareId: input.shareId.trim(), organizationId });
  if (!revoked) throw new Error("Design share was not found or was already revoked");
  revalidatePath(`/design-studio/${project.id}`);
  return { revoked: true };
}

export async function createDesignProjectAction(formData: FormData) {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Select an organization before creating a design project");
  await requireAdvancedDesignStudio(user, organizationId);

  const projectId = await createDesignProject(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, name: formString(formData, "name"), createdByUserId: user.id },
  );

  const floorName = formString(formData, "floorName") || "Level 1";
  await createDesignFloor(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, projectId, name: floorName, levelOrder: 0 },
  );

  revalidatePath("/design-studio");
  redirect(`/design-studio/${projectId}?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function uploadDesignFloorPlanAction(formData: FormData): Promise<void> {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  const projectId = formString(formData, "projectId");
  const floorId = formString(formData, "floorId");
  const uploaded = formData.get("file");

  if (!organizationId || !projectId || !floorId) throw new Error("Organization, project and floor are required");
  await requireAdvancedDesignStudio(user, organizationId);
  if (!(uploaded instanceof File) || !uploaded.name) throw new Error("Select a PDF, JPG or PNG floor plan");

  const bytes = new Uint8Array(await uploaded.arrayBuffer());
  const asset = validateDesignFloorPlanUpload({
    fileName: uploaded.name,
    mimeType: uploaded.type.toLowerCase(),
    byteSize: bytes.byteLength,
    bytes,
  });
  const storageKey = designFloorPlanStorageKey(organizationId, projectId, asset.assetId, asset.extension);

  await storePrivateDesignAsset(storageKey, bytes);
  try {
    await persistFloorPlanAssetAndAttach(
      { role: user.role, organizationId: user.organizationId },
      { organizationId, projectId, floorId, storageKey, asset, createdByUserId: user.id },
    );
  } catch (error) {
    await deletePrivateDesignAsset(storageKey);
    throw error;
  }

  revalidatePath(`/design-studio/${projectId}`);
}

export async function updateDesignFloorBackgroundAction(formData: FormData): Promise<void> {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  const projectId = formString(formData, "projectId");
  const floorId = formString(formData, "floorId");
  const opacityPercent = Number(formString(formData, "opacityPercent"));

  if (!organizationId || !projectId || !floorId) throw new Error("Organization, project and floor are required");
  await requireAdvancedDesignStudio(user, organizationId);
  await updateDesignFloorBackgroundSettings(
    { role: user.role, organizationId: user.organizationId },
    {
      organizationId,
      projectId,
      floorId,
      opacity: opacityPercent / 100,
      visible: formData.get("visible") === "on",
      locked: formData.get("locked") === "on",
    },
  );

  revalidatePath(`/design-studio/${projectId}`);
}

export async function updateDesignFloorPdfPageAction(formData: FormData): Promise<void> {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  const projectId = formString(formData, "projectId");
  const floorId = formString(formData, "floorId");
  const page = Number(formString(formData, "pdfPage"));

  if (!organizationId || !projectId || !floorId) throw new Error("Organization, project and floor are required");
  await requireAdvancedDesignStudio(user, organizationId);
  await updateDesignFloorPdfPage(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, projectId, floorId, page },
  );
  revalidatePath(`/design-studio/${projectId}`);
}

export async function updateDesignFloorScaleAction(formData: FormData): Promise<void> {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  const projectId = formString(formData, "projectId");
  const floorId = formString(formData, "floorId");

  if (!organizationId || !projectId || !floorId) throw new Error("Organization, project and floor are required");
  await requireAdvancedDesignStudio(user, organizationId);
  await updateDesignFloorScale(
    { role: user.role, organizationId: user.organizationId },
    {
      organizationId,
      projectId,
      floorId,
      referenceDesignUnits: Number(formString(formData, "referenceDesignUnits")),
      referenceRealUnits: Number(formString(formData, "referenceRealUnits")),
      scaleUnit: formString(formData, "scaleUnit"),
      confirmScaleChange: formData.get("confirmScaleChange") === "on",
    },
  );
  revalidatePath(`/design-studio/${projectId}`);
}

export async function saveDesignCanvasAction(input: {
  organizationId: string;
  projectId: string;
  floorId: string;
  expectedRevision: number;
  document: CanvasDocument;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  await requireAdvancedDesignStudio(user, organizationId);
  const nextRevision = await saveDesignFloorCanvas(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return { revision: nextRevision };
}

export async function createDesignCheckpointAction(input: {
  organizationId: string;
  projectId: string;
  expectedRevision: number;
  reason?: string | null;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  await requireAdvancedDesignStudio(user, organizationId);
  const version = await createDesignVersionCheckpoint(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId, createdByUserId: user.id },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return version;
}

export async function getDesignVersionPreviewAction(input: {
  organizationId: string;
  projectId: string;
  versionId: string;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  await requireAdvancedDesignStudio(user, organizationId);
  return getDesignVersionSnapshot(
    { role: user.role, organizationId: user.organizationId },
    input.projectId,
    input.versionId,
    organizationId,
  );
}

export async function restoreDesignVersionAction(input: {
  organizationId: string;
  projectId: string;
  versionId: string;
  expectedRevision: number;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  await requireAdvancedDesignStudio(user, organizationId);
  const revision = await restoreDesignVersion(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return { revision };
}
