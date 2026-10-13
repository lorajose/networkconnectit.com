import { NextRequest, NextResponse } from "next/server";

import { getMenuBoardPlayerContent } from "@/lib/menuboard/publish";

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
      { error: "Player credential required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const content = await getMenuBoardPlayerContent(token);

  if (!content) {
    return NextResponse.json(
      { error: "Player credential is invalid or revoked." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      screen: content.screen,
      activePublish: content.assignment?.activePublish ?? null,
      menuId: content.assignment?.menuId ?? null
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
