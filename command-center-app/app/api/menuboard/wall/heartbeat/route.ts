import { NextRequest, NextResponse } from "next/server";

import { recordMenuBoardWallHeartbeat } from "@/lib/menuboard/wall";

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
      { error: "Wall player credential required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: {
    playerVersion?: unknown;
    manifestHash?: unknown;
    displayedZones?: unknown;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Heartbeat body must be valid JSON." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await recordMenuBoardWallHeartbeat(token, {
    playerVersion:
      typeof body.playerVersion === "string" ? body.playerVersion : null,
    manifestHash:
      typeof body.manifestHash === "string" ? body.manifestHash : null,
    displayedZones: body.displayedZones,
  });

  if (!result) {
    return NextResponse.json(
      { error: "Wall player credential is invalid or revoked." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { receivedAt: result.receivedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
