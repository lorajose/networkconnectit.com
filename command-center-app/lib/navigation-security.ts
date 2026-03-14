export function sanitizeInternalRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard"
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  if (
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n")
  ) {
    return fallback;
  }

  return trimmed;
}
