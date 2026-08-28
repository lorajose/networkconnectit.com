import { NextResponse } from "next/server";

import { isEnabledEnvironmentFlag, looksLikePlaceholderValue } from "@/lib/runtime-config";

const MIN_TOKEN_LENGTH = 24;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const rawFlag = process.env.ENABLE_FIRST_ADMIN_BOOTSTRAP;
  const token = process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN?.trim() ?? "";

  return NextResponse.json(
    {
      bootstrapFlagPresent: typeof rawFlag === "string" && rawFlag.length > 0,
      bootstrapFlagEnabled: isEnabledEnvironmentFlag(rawFlag),
      bootstrapTokenPresent: token.length > 0,
      bootstrapTokenLengthValid: token.length >= MIN_TOKEN_LENGTH,
      bootstrapTokenLooksLikePlaceholder: token.length > 0 && looksLikePlaceholderValue(token)
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
