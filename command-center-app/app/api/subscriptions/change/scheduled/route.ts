import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { cancelOrganizationScheduledPlanChange } from "@/lib/contractor-os/subscription-management-service";

export const dynamic = "force-dynamic";

const BILLING_ROLES = ["CLIENT_ADMIN"] as const;

export async function DELETE() {
  const auth = await requireApiRoles(BILLING_ROLES);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }

  const organizationId = auth.user.organizationId?.trim() ?? "";
  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: "An organization is required to manage billing." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    await cancelOrganizationScheduledPlanChange(organizationId);
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict =
      message.includes("paid subscription is required") ||
      message.includes("Only an active subscription can be changed") ||
      message.includes("No subscription plan change is scheduled");

    return NextResponse.json(
      {
        ok: false,
        error: conflict
          ? message
          : "Unable to cancel the scheduled plan change right now.",
      },
      {
        status: conflict ? 409 : 502,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
