import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { attachTechnicianDocument } from "@/lib/company-operations/repository";
import { technicianDocumentStorageKey, validateTechnicianDocumentUpload } from "@/lib/private-evidence/policy";
import { privateEvidenceStorage } from "@/lib/private-evidence/storage";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { technicianId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperationsWrite);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status });
  let storageKey: string | null = null;
  let storage: ReturnType<typeof privateEvidenceStorage> | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Document file is required." }, { status: 400 });
    const organizationId = auth.user.organizationId?.trim() || form.get("organizationId")?.toString().trim() || "";
    const validated = validateTechnicianDocumentUpload({
      organizationId,
      technicianProfileId: context.params.technicianId,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });
    const documentId = randomUUID();
    storageKey = technicianDocumentStorageKey({ ...validated, objectId: randomUUID() });
    storage = privateEvidenceStorage();
    await storage.put(storageKey, { body: new Uint8Array(await file.arrayBuffer()), contentType: validated.contentType, fileName: validated.fileName });
    try {
      await attachTechnicianDocument(
        { id: auth.user.id, role: auth.user.role, organizationId: auth.user.organizationId ?? null },
        {
          organizationId: validated.organizationId,
          technicianProfileId: validated.technicianProfileId,
          documentId,
          documentType: form.get("documentType")?.toString().trim() || "OTHER",
          title: form.get("title")?.toString().trim() || validated.fileName,
          expiresOn: form.get("expiresOn")?.toString().trim() || null,
          storageKey,
        }
      );
    } catch (error) {
      await storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ ok: true, documentId }, { status: 201 });
  } catch (error) {
    if (storage && storageKey) await storage.remove(storageKey).catch(() => undefined);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Document upload failed." }, { status: 400 });
  }
}
