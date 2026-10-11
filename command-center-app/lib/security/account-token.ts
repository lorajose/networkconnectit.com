import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type AccountTokenPurpose = "PASSWORD_RESET" | "EMAIL_VERIFY";

type AccountTokenPayload = {
  v: 1;
  purpose: AccountTokenPurpose;
  userId: string;
  authVersion: number;
  email?: string;
  exp: number;
  nonce: string;
};

const MAX_RESET_SECONDS = 15 * 60;
const MAX_VERIFY_SECONDS = 24 * 60 * 60;
const DEVELOPMENT_AUTH_FALLBACK_SECRET = "development-only-command-center-secret";
const BUILD_ONLY_AUTH_FALLBACK_SECRET = "build-only-command-center-secret-never-use-at-runtime";
const NEXT_PHASE_PRODUCTION_BUILD = "phase-production-build";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function accountTokenAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    if (process.env.NEXT_PHASE === NEXT_PHASE_PRODUCTION_BUILD) {
      return BUILD_ONLY_AUTH_FALLBACK_SECRET;
    }
    throw new Error("NEXTAUTH_SECRET is required in production and staging environments.");
  }

  return DEVELOPMENT_AUTH_FALLBACK_SECRET;
}

function signingKey() {
  return createHmac("sha256", accountTokenAuthSecret())
    .update("networkconnectit:account-lifecycle:v1")
    .digest();
}

function sign(encodedPayload: string) {
  return createHmac("sha256", signingKey()).update(encodedPayload).digest("base64url");
}

export function issueAccountToken(input: {
  purpose: AccountTokenPurpose;
  userId: string;
  authVersion: number;
  email?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const ttl = input.purpose === "PASSWORD_RESET" ? MAX_RESET_SECONDS : MAX_VERIFY_SECONDS;
  const payload: AccountTokenPayload = {
    v: 1,
    purpose: input.purpose,
    userId: input.userId,
    authVersion: input.authVersion,
    email: input.email?.trim().toLowerCase(),
    exp: Math.floor(now.getTime() / 1000) + ttl,
    nonce: randomBytes(18).toString("base64url")
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAccountToken(
  token: string,
  expectedPurpose: AccountTokenPurpose,
  now = new Date()
): AccountTokenPayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new Error("Invalid or expired account token.");

  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid or expired account token.");
  }

  let payload: AccountTokenPayload;
  try {
    payload = JSON.parse(decode(encoded)) as AccountTokenPayload;
  } catch {
    throw new Error("Invalid or expired account token.");
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (
    payload.v !== 1 ||
    payload.purpose !== expectedPurpose ||
    !payload.userId ||
    !Number.isInteger(payload.authVersion) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= nowSeconds ||
    !payload.nonce
  ) {
    throw new Error("Invalid or expired account token.");
  }

  return payload;
}
