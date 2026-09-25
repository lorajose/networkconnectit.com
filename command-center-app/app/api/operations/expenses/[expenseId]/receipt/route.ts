import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { attachExpenseReceipt, getExpenseReceiptReference } from "@/lib/company-operations/repository";
import { receiptStorageKey, validateReceiptUpload } from "@/lib/private-evidence/policy";
import { privateEvidenceStorage } from "@/lib/private-evidence/storage";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function actorFor(user: { id: string; role: any; organizationId?: string | null }) {
  return { id: user.id, role: user.role, organizationId: user.organizationId };
}

function requestedOrganizationId(user: { organizationId?: string | null }, form?: FormData) {
  return user.organizationId?.trim() || form?.get("organizationId")?.toString().trim() || undefined;
}

export async function GET(_request: Request, context: { params: { expenseId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperations);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status, headers: noStore });
  }

  try {
    const actor = actorFor(auth.user);
    const receipt = await getExpenseReceiptReference(actor, {
      organizationId: requestedOrganizationId(auth.user),
      expenseId: context.params.expenseId,
    });
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

export async function POST(request: Request, context: { params: { expenseId: string } }) {
  const auth = await requireApiRoles(routeAccess.companyOperations);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status, headers: noStore });
  }

  let storageKey: string | null = null;
  let storage: ReturnType<typeof privateEvidenceStorage> | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Receipt file is required." }, { status: 400, headers: noStore });
    }

    const organizationId = requestedOrganizationId(auth.user, form);
    const actor = actorFor(auth.user);
    const expense = await getExpenseReceiptReference(actor, {
      organizationId,
      expenseId: context.params.expenseId,
    });

    const validated = validateReceiptUpload({
      organizationId: organizationId ?? "",
      expenseId: expense.expenseId,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });
    storageKey = receiptStorageKey({
      organizationId: validated.organizationId,
      expenseId: validated.expenseId,
      objectId: randomUUID(),
      fileName: validated.fileName,
    });

    storage = privateEvidenceStorage();
    const bytes = new Uint8Array(await file.arrayBuffer());
    await storage.put(storageKey, {
      body: bytes,
      contentType: validated.contentType,
      fileName: validated.fileName,
    });

    try {
      await attachExpenseReceipt(actor, {
        organizationId: validated.organizationId,
        expenseId: validated.expenseId,
        storageKey,
      });
    } catch (error) {
      await storage.remove(storageKey).catch(() => undefined);
      throw error;
    }

    if (expense.storageKey && expense.storageKey !== storageKey) {
      await storage.remove(expense.storageKey).catch(() => undefined);
    }

    return NextResponse.json({ ok: true }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof Error && error.message === "Private evidence storage backend is not configured.") {
      return NextResponse.json(
        { ok: false, error: "Private receipt storage backend is not configured." },
        { status: 503, headers: noStore }
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Receipt upload failed." },
      { status: 400, headers: noStore }
    );
  }
}
