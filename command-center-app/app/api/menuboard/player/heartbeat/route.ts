import { NextRequest, NextResponse } from "next/server";

import { recordMenuBoardHeartbeat } from "@/lib/menuboard/publish";

export const dynamic = "force-dynamic";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: "Player credential required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let playerVersion: string | null = null;
  let publishVersion: number | null = null;

  try {
    const body = (await request.json()) as {
      playerVersion?: unknown;
      publishVersion?: unknown;
    };

    playerVersion =
      typeof body.playerVersion === "string" ? body.playerVersion : null;

    if (
      typeof body.publishVersion === "number" &&
      Number.isInteger(body.publishVersion) &&
      body.publishVersion >= 0
    ) {
      publishVersion = body.publishVersion;
    }
  } catch {
    return NextResponse.json(
      { error: "Heartbeat body must be valid JSON." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await recordMenuBoardHeartbeat(token, {
    playerVersion,
    publishVersion
  });

  if (!result) {
    return NextResponse.json(
      { error: "Player credential is invalid or revoked." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      screenId: result.screenId,
      receivedAt: result.receivedAt.toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
