export type RuntimeConfigWarning = {
  id: string;
  tone: "info" | "warning" | "critical";
  title: string;
  description: string;
};

const DEVELOPMENT_AUTH_FALLBACK_SECRET =
  "development-only-command-center-secret";
const FIRST_ADMIN_BOOTSTRAP_TOKEN_MIN_LENGTH = 24;

function normalizeBasePath(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

export function looksLikePlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.includes("replace-with") ||
    normalized.includes("development-only") ||
    normalized.includes("changeme") ||
    normalized.includes("example")
  );
}

export function isEnabledEnvironmentFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function getAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is required in production and staging environments."
    );
  }

  return DEVELOPMENT_AUTH_FALLBACK_SECRET;
}

export function getRuntimeConfigWarnings(): RuntimeConfigWarning[] {
  const warnings: RuntimeConfigWarning[] = [];
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_APP_BASE_PATH);
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() ?? "";
  const marketingSiteUrl =
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const firstAdminBootstrapEnabled = isEnabledEnvironmentFlag(
    process.env.ENABLE_FIRST_ADMIN_BOOTSTRAP
  );
  const firstAdminBootstrapToken =
    process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN?.trim() ?? "";

  if (!databaseUrl) {
    warnings.push({
      id: "database-url-missing",
      tone: "critical",
      title: "DATABASE_URL is missing",
      description:
        "The app cannot connect to MySQL until DATABASE_URL is configured for this environment."
    });
  }

  if (!nextAuthSecret) {
    warnings.push({
      id: "nextauth-secret-missing",
      tone: process.env.NODE_ENV === "production" ? "critical" : "warning",
      title: "NEXTAUTH_SECRET is missing",
      description:
        process.env.NODE_ENV === "production"
          ? "Authentication will fail in staging/production until NEXTAUTH_SECRET is set."
          : "Local development will fall back to an insecure temporary secret. Set NEXTAUTH_SECRET before sharing the environment."
    });
  } else if (
    looksLikePlaceholderValue(nextAuthSecret) ||
    nextAuthSecret.length < 32
  ) {
    warnings.push({
      id: "nextauth-secret-weak",
      tone: "warning",
      title: "NEXTAUTH_SECRET looks weak or placeholder-based",
      description:
        "Use a long random secret for staging and production so JWT sessions are not easy to invalidate or replay."
    });
  }

  if (!nextAuthUrl) {
    warnings.push({
      id: "nextauth-url-missing",
      tone: "critical",
      title: "NEXTAUTH_URL is missing",
      description:
        "Auth callbacks and proxy-aware sign-in flows need NEXTAUTH_URL set to the deployed public auth endpoint."
    });
  } else if (!isValidUrl(nextAuthUrl)) {
    warnings.push({
      id: "nextauth-url-invalid",
      tone: "critical",
      title: "NEXTAUTH_URL is invalid",
      description:
        "Set NEXTAUTH_URL to a valid absolute URL so sign-in, sign-out, and callback redirects resolve correctly."
    });
  } else if (basePath) {
    const expectedAuthPath = `${basePath}/api/auth`;

    if (!nextAuthUrl.endsWith(expectedAuthPath)) {
      warnings.push({
        id: "nextauth-url-basepath-mismatch",
        tone: "warning",
        title: "NEXTAUTH_URL does not match the configured app base path",
        description: `When NEXT_PUBLIC_APP_BASE_PATH is set to "${basePath}", NEXTAUTH_URL should end with "${expectedAuthPath}" to keep auth callbacks stable behind a reverse-proxied path.`
      });
    }
  }

  if (!marketingSiteUrl) {
    warnings.push({
      id: "marketing-site-url-missing",
      tone: "info",
      title: "Marketing site URL is not configured",
      description:
        "Login header and footer links will stay inside the app until NEXT_PUBLIC_MARKETING_SITE_URL is set to the public static-site origin."
    });
  } else if (!isValidUrl(marketingSiteUrl)) {
    warnings.push({
      id: "marketing-site-url-invalid",
      tone: "warning",
      title: "Marketing site URL is invalid",
      description:
        "NEXT_PUBLIC_MARKETING_SITE_URL should be a valid absolute URL so auth shell navigation links point back to the public site cleanly."
    });
  }

  if (firstAdminBootstrapEnabled && !firstAdminBootstrapToken) {
    warnings.push({
      id: "first-admin-bootstrap-token-missing",
      tone: "critical",
      title: "First-admin bootstrap is enabled without a token",
      description:
        "Set FIRST_ADMIN_BOOTSTRAP_TOKEN before exposing the one-time bootstrap route, or disable ENABLE_FIRST_ADMIN_BOOTSTRAP."
    });
  } else if (
    firstAdminBootstrapEnabled &&
    (firstAdminBootstrapToken.length < FIRST_ADMIN_BOOTSTRAP_TOKEN_MIN_LENGTH ||
      looksLikePlaceholderValue(firstAdminBootstrapToken))
  ) {
    warnings.push({
      id: "first-admin-bootstrap-token-weak",
      tone: "warning",
      title: "First-admin bootstrap token looks weak or placeholder-based",
      description:
        "Use a long random FIRST_ADMIN_BOOTSTRAP_TOKEN before enabling the first-admin bootstrap route in staging or production."
    });
  }

  if (firstAdminBootstrapEnabled) {
    warnings.push({
      id: "first-admin-bootstrap-enabled",
      tone: "warning",
      title: "First-admin bootstrap is still enabled",
      description:
        "Disable ENABLE_FIRST_ADMIN_BOOTSTRAP after creating the first internal admin so the bootstrap route cannot be reused."
    });
  }

  return warnings;
}
