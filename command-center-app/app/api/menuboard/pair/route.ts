import { NextRequest, NextResponse } from "next/server";

import { consumeMenuBoardPairingCode } from "@/lib/menuboard/screens";
import { checkMenuBoardPairingRateLimit } from "@/lib/menuboard/pairing-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientKey =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const rateLimit = checkMenuBoardPairingRateLimit(clientKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many pairing attempts. Try again shortly." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

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
