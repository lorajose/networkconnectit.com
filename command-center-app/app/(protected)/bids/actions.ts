"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { addBidDocumentMetadata, createBidWorkspace, updateBidWorkspace, type BidStatus } from "@/lib/contractor-os/bid-repository";
import type { BidDocumentType } from "@/lib/contractor-os/bid-intake";
import { snapshotBidEvidenceForEstimate } from "@/lib/contractor-os/estimate-evidence";

function formString(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value.trim() : ""; }
function actor(user: Awaited<ReturnType<typeof requireUser>>) { return { role: user.role, organizationId: user.organizationId }; }

export async function createBidAction(formData: FormData) {
  const user = await requireUser(); const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Select an organization before creating a bid");
  const bidId = await createBidWorkspace(actor(user), { organizationId, bidNumber: formString(formData, "bidNumber"), title: formString(formData, "title"), revision: formString(formData, "revision") || null, bidDueAt: formString(formData, "bidDueAt") || null, notes: formString(formData, "notes") || null, projectInstallationId: formString(formData, "projectInstallationId") || null, estimateId: formString(formData, "estimateId") || null });
  revalidatePath("/bids"); redirect(`/bids/${bidId}?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function updateBidAction(formData: FormData) {
  const user = await requireUser(); const organizationId = formString(formData, "organizationId"); const bidId = formString(formData, "bidId");
  await updateBidWorkspace(actor(user), { organizationId, bidId, title: formString(formData, "title"), status: formString(formData, "status") as BidStatus, revision: formString(formData, "revision") || null, bidDueAt: formString(formData, "bidDueAt") || null, notes: formString(formData, "notes") || null, projectInstallationId: formString(formData, "projectInstallationId") || null, estimateId: formString(formData, "estimateId") || null });
  revalidatePath(`/bids/${bidId}`); revalidatePath("/bids");
}

export async function addBidDocumentAction(formData: FormData) {
  const user = await requireUser(); const organizationId = formString(formData, "organizationId"); const bidId = formString(formData, "bidId");
  await addBidDocumentMetadata(actor(user), organizationId, bidId, { fileName: formString(formData, "fileName"), documentType: formString(formData, "documentType") as BidDocumentType, revision: formString(formData, "revision") || null, sourceKey: formString(formData, "sourceKey"), sourceMimeType: formString(formData, "sourceMimeType") || null, sourceSizeBytes: formString(formData, "sourceSizeBytes") ? Number(formString(formData, "sourceSizeBytes")) : null });
  revalidatePath(`/bids/${bidId}`);
}

export async function snapshotBidEvidenceAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const bidId = formString(formData, "bidId");
  await snapshotBidEvidenceForEstimate(actor(user), organizationId, bidId);
  revalidatePath(`/bids/${bidId}`);
  revalidatePath("/bids");
  revalidatePath("/estimates");
}
