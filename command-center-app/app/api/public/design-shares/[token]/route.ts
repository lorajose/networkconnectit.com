import { NextRequest, NextResponse } from "next/server";

import { resolveDesignShare } from "@/lib/contractor-os/design-share-link";
import { mysqlDesignShareRepository } from "@/lib/contractor-os/design-share-repository";

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
  return resolveToken(params.token);
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  let body: { password?: string; event?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const event = body.event === "DOWNLOAD" ? "DOWNLOAD" : "VIEW";
  return resolveToken(params.token, body.password, event);
}