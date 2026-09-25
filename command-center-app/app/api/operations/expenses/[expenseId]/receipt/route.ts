import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { getExpenseReceiptReference } from "@/lib/company-operations/repository";
import { privateEvidenceStorage } from "@/lib/private-evidence/storage";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: { params: { expenseId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperations);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status, headers: noStore });
  }

  try {
    const actor = { id: auth.user.id, role: auth.user.role, organizationId: auth.user.organizationId };
    const receipt = await getExpenseReceiptReference(actor, { expenseId: context.params.expenseId });
    if (!receipt.hasReceipt || !receipt.storageKey) {
      return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404, headers: noStore });
    }

    const object = await privateEvidenceStorage().get(receipt.storageKey);
    if (!object) {
      return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404, headers: noStore });
    }

    const body = object.body.slice().buffer;
    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": object.contentType,
        "Content-Disposition": `attachment; filename="${object.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Private evidence storage backend is not configured.") {
      return NextResponse.json(
        { ok: false, error: "Private receipt storage backend is not configured." },
        { status: 503, headers: noStore }
      );
    }
    return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404, headers: noStore });
  }
}
