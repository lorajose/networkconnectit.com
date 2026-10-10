import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { changeOrganizationSubscription } from "@/lib/contractor-os/subscription-management-service";
import { isSubscriptionPlan, type SubscriptionPlan } from "@/lib/contractor-os/subscription-plan";

export const dynamic = "force-dynamic";

const BILLING_ROLES = ["CLIENT_ADMIN"] as const;

type SubscriptionChangeInput = {
  plan?: unknown;
};

export async function POST(request: Request) {
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

  let body: SubscriptionChangeInput;
  try {
    body = (await request.json()) as SubscriptionChangeInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON request body is required." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let requestedPlan: SubscriptionPlan | null;
  if (body.plan === null) {
    requestedPlan = null;
  } else if (typeof body.plan === "string" && isSubscriptionPlan(body.plan)) {
    requestedPlan = body.plan;
  } else {
    return NextResponse.json(
      { ok: false, error: "A valid subscription plan or cancellation is required." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const change = await changeOrganizationSubscription(
      organizationId,
      requestedPlan
    );

    return NextResponse.json(
      {
        ok: true,
        change: {
          kind: change.kind,
          effective: change.effective,
          toPlan: "toPlan" in change ? change.toPlan : null,
        },
      },
      { status: 202, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const conflict =
      message.includes("already active") ||
      message.includes("paid subscription is required") ||
      message.includes("Only an active subscription can be changed");

    return NextResponse.json(
      {
        ok: false,
        error: conflict
          ? message
          : "Unable to update the subscription right now.",
      },
      {
        status: conflict ? 409 : 502,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
