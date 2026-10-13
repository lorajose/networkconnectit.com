import { NextRequest, NextResponse } from "next/server";

import { consumeMenuBoardPairingCode } from "@/lib/menuboard/screens";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let code = "";

  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return NextResponse.json(
      { error: "A six-digit pairing code is required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const paired = await consumeMenuBoardPairingCode(code);

  if (!paired) {
    return NextResponse.json(
      { error: "Pairing code is invalid, expired, or already used." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  return NextResponse.json(
    {
      screen: paired.screen,
      playerToken: paired.playerToken
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
