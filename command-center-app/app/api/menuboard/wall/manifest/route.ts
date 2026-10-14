import { NextRequest, NextResponse } from "next/server";

import { getMenuBoardWallPlayerManifest } from "@/lib/menuboard/wall";

export const dynamic = "force-dynamic";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: "Wall player credential required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const content = await getMenuBoardWallPlayerManifest(token);

  if (!content) {
    return NextResponse.json(
      { error: "Wall player credential is invalid or revoked." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (content.malformed) {
    return NextResponse.json(
      { error: "Published wall content is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (content.incomplete || !content.manifest) {
    return NextResponse.json(
      {
        displayGroup: content.displayGroup,
        ready: false,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ready: true,
      manifest: content.manifest,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
