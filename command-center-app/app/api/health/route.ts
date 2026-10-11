import { NextResponse } from "next/server";

import { runtimeHealthSnapshot } from "@/lib/operations/health";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(runtimeHealthSnapshot(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
