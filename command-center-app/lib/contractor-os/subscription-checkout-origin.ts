type CheckoutEnvironment = {
  NEXTAUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_APP_BASE_PATH?: string;
  NODE_ENV?: string;
};

function normalizedBasePath(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function configuredApplicationRoot(value: string | undefined, stripNextAuthPath = false): string | null {
  if (!value?.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    parsed.search = "";
    parsed.hash = "";
    let pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
    if (stripNextAuthPath && pathname.endsWith("/api/auth")) pathname = pathname.slice(0, -"/api/auth".length);

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
}

/**
 * Builds Stripe return URLs exclusively from trusted server configuration.
 * NEXTAUTH_URL conventionally ends in /api/auth, so that suffix is removed
 * before deriving the application root. Request Host/Origin headers never
 * influence this value.
 */
export function subscriptionApplicationRoot(environment: CheckoutEnvironment = process.env) {
  const nextAuthRoot = configuredApplicationRoot(environment.NEXTAUTH_URL, true);
  if (nextAuthRoot) return nextAuthRoot;

  const publicAppRoot = configuredApplicationRoot(environment.NEXT_PUBLIC_APP_URL);
  if (publicAppRoot) return publicAppRoot;

  if (environment.NODE_ENV !== "production") {
    return `http://localhost:3000${normalizedBasePath(environment.NEXT_PUBLIC_APP_BASE_PATH)}`;
  }

  throw new Error("Subscription checkout return URL is not configured");
}
