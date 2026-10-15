import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveDesignShare } from "@/lib/contractor-os/design-share-link";
import { mysqlDesignShareRepository } from "@/lib/contractor-os/design-share-repository";
import { clearLoginFailures, isLoginTemporarilyBlocked, recordLoginFailure } from "@/lib/security/login-abuse-control";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function abuseKey(token: string) {
  const fingerprint = createHash("sha256").update(token).digest("hex");
  return `design-share:${fingerprint}`;
}

async function resolveToken(token: string, password?: string, event: "VIEW" | "DOWNLOAD" = "VIEW") {
  try {
    const share = await resolveDesignShare({
      repository: mysqlDesignShareRepository,
      token,
      password,
      event,
    });
    return json({ ok: true, share });
  } catch {
    return json({ ok: false, error: "Share link is unavailable" }, 404);
  }
}

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const key = abuseKey(params.token);
  if (isLoginTemporarilyBlocked(key)) {
    return json({ ok: false, error: "Share link is unavailable" }, 429);
  }

  try {
    const share = await resolveDesignShare({
      repository: mysqlDesignShareRepository,
      token: params.token,
      event: "VIEW",
    });
    clearLoginFailures(key);
    return json({ ok: true, share });
  } catch {
    recordLoginFailure(key);
    return json({ ok: false, error: "Share link is unavailable" }, 404);
  }
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const key = abuseKey(params.token);
  if (isLoginTemporarilyBlocked(key)) {
    return json({ ok: false, error: "Share link is unavailable" }, 429);
  }

  let body: { password?: string; event?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const event = body.event === "DOWNLOAD" ? "DOWNLOAD" : "VIEW";

  try {
    const share = await resolveDesignShare({
      repository: mysqlDesignShareRepository,
      token: params.token,
      password: body.password,
      event,
    });
    clearLoginFailures(key);
    return json({ ok: true, share });
  } catch {
    recordLoginFailure(key);
    return json({ ok: false, error: "Share link is unavailable" }, 404);
  }
}
