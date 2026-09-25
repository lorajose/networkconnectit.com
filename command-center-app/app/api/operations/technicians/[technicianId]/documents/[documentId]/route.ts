import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { getTechnicianDocumentReference } from "@/lib/company-operations/repository";
import { privateEvidenceStorage } from "@/lib/private-evidence/storage";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { technicianId: string; documentId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperationsWrite);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status });
  try {
    const document = await getTechnicianDocumentReference(
      { id: auth.user.id, role: auth.user.role, organizationId: auth.user.organizationId ?? null },
      {
        organizationId: auth.user.organizationId?.trim() || new URL(request.url).searchParams.get("organizationId")?.trim() || undefined,
        technicianProfileId: context.params.technicianId,
        documentId: context.params.documentId,
      }
    );
    const object = await privateEvidenceStorage().get(document.storageKey);
    if (!object) return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
    return new Response(object.body.slice().buffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": object.contentType,
        "Content-Disposition": `attachment; filename="${object.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
  }
}
