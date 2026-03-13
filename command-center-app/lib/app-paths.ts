const rawAppBasePath = process.env.NEXT_PUBLIC_APP_BASE_PATH?.trim() ?? "";
const rawMarketingSiteUrl =
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ?? "";

export const appBasePath =
  rawAppBasePath && rawAppBasePath !== "/"
    ? rawAppBasePath.replace(/\/+$/, "")
    : "";

export const marketingSiteUrl = rawMarketingSiteUrl.replace(/\/+$/, "");

export const nextAuthBasePath = appBasePath
  ? `${appBasePath}/api/auth`
  : "/api/auth";

export function withAppBasePath(path: string) {
  if (!path.startsWith("/") || !appBasePath) {
    return path;
  }

  return path === "/" ? appBasePath : `${appBasePath}${path}`;
}

export function stripAppBasePath(pathname: string) {
  if (!appBasePath || !pathname.startsWith(appBasePath)) {
    return pathname;
  }

  const strippedPath = pathname.slice(appBasePath.length);
  return strippedPath || "/";
}

export function withMarketingSiteUrl(path: string) {
  if (!marketingSiteUrl || !path.startsWith("/")) {
    return path;
  }

  return `${marketingSiteUrl}${path}`;
}
