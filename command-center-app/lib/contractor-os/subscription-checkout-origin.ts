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

function configuredApplicationRoot(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    parsed.search = "";
    parsed.hash = "";
    const pathname =
      parsed.pathname && parsed.pathname !== "/"
        ? parsed.pathname.replace(/\/+$/, "")
        : "";

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
}

/**
 * Builds Stripe return URLs exclusively from trusted server configuration.
 * Request Host/Origin headers never influence this value.
 */
export function subscriptionApplicationRoot(
  environment: CheckoutEnvironment = process.env
) {
  for (const configured of [
    environment.NEXTAUTH_URL,
    environment.NEXT_PUBLIC_APP_URL,
  ]) {
    const root = configuredApplicationRoot(configured);
    if (root) return root;
  }

  if (environment.NODE_ENV !== "production") {
    return `http://localhost:3000${normalizedBasePath(
      environment.NEXT_PUBLIC_APP_BASE_PATH
    )}`;
  }

  throw new Error("Subscription checkout return URL is not configured");
}
