import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { getExpenseReceiptReference } from "@/lib/company-operations/repository";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: { expenseId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperations);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const actor = { id: auth.user.id, role: auth.user.role, organizationId: auth.user.organizationId };
    const receipt = await getExpenseReceiptReference(actor, { expenseId: context.params.expenseId });
    if (!receipt.hasReceipt) {
      return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    // Do not expose the private storage key. Binary retrieval remains fail-closed
    // until the configured PrivateEvidenceStorage backend is implemented.
    return NextResponse.json(
      { ok: false, error: "Private receipt storage backend is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
