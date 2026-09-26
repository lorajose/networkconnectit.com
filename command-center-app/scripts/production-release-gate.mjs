import path from "node:path";

const required = ["NEXTAUTH_URL", "NEXTAUTH_SECRET"];
const legacyBasePath = "/tools/command-center";
const rootDomain = "command.networkconnectit.com";
const failures = [];
const warnings = [];
const nodeEnv = (process.env.NODE_ENV ?? "").trim().toLowerCase();

for (const name of required) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) failures.push(`${name} is required`);
}

const secret = process.env.NEXTAUTH_SECRET?.trim() ?? "";
if (secret && (secret.length < 32 || /replace-with|changeme|example|secret/i.test(secret))) {
  failures.push("NEXTAUTH_SECRET must be a strong non-placeholder value (32+ characters)");
}

const authUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH?.trim() ?? "";
if (authUrl) {
  try {
    const url = new URL(authUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") failures.push("NEXTAUTH_URL must use HTTPS in production");
    if (nodeEnv === "production" && url.hostname !== rootDomain) failures.push(`NEXTAUTH_URL production host must be ${rootDomain}`);
    const expected = `${basePath}/api/auth`.replace(/\/+/g, "/");
    if (!url.pathname.endsWith(expected)) failures.push(`NEXTAUTH_URL path must end with ${expected}`);
    if (url.hostname === rootDomain && basePath === legacyBasePath) failures.push(`NEXT_PUBLIC_APP_BASE_PATH must be empty when NEXTAUTH_URL uses ${rootDomain}`);
  } catch {
    failures.push("NEXTAUTH_URL must be a valid URL");
  }
}

const namespacedBootstrap = (process.env.NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP ?? "").trim();
if (namespacedBootstrap && !["false", "0", "no", "off", "disabled"].includes(namespacedBootstrap.toLowerCase())) failures.push("NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP must be disabled when present");
const legacyBootstrap = (process.env.ENABLE_FIRST_ADMIN_BOOTSTRAP ?? "").trim().toLowerCase();
if (legacyBootstrap && !["false", "0", "no", "off", "disabled"].includes(legacyBootstrap)) failures.push("ENABLE_FIRST_ADMIN_BOOTSTRAP must be disabled when present");
if ((process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN ?? "").trim()) failures.push("FIRST_ADMIN_BOOTSTRAP_TOKEN must be empty/removed");
if ((process.env.NCI_RECOVER_NCI049 ?? "").trim() === "1") failures.push("NCI_RECOVER_NCI049 recovery flag must be disabled for release");
if ((process.env.NCI_RECOVER_ALERT_SCHEMA ?? "").trim() === "1") failures.push("NCI_RECOVER_ALERT_SCHEMA recovery flag must be disabled for release");

if (nodeEnv !== "production") failures.push("NODE_ENV must be production");
if ((process.env.DATABASE_ADMIN_URL ?? "").trim()) failures.push("DATABASE_ADMIN_URL must not be configured in production");
if ((process.env.NCI_ALLOW_DEMO_SEED ?? "").trim().toLowerCase() && !["false","0","no","off","disabled"].includes((process.env.NCI_ALLOW_DEMO_SEED ?? "").trim().toLowerCase())) failures.push("NCI_ALLOW_DEMO_SEED must be disabled in production");

const databaseTlsMode = (process.env.NCI_DATABASE_TLS_MODE ?? "").trim().toLowerCase();
if (!["required","verify-ca","verify-identity"].includes(databaseTlsMode)) failures.push("NCI_DATABASE_TLS_MODE must explicitly require TLS (required, verify-ca, or verify-identity)");

const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
const hasDiscreteDatabaseSecrets = ["DB_HOST", "DB_NAME", "DB_USER"].every((name) => (process.env[name] ?? "").trim().length > 0);
if (!databaseUrl && !hasDiscreteDatabaseSecrets) failures.push("Production database connection must be configured with DATABASE_URL or DB_HOST/DB_NAME/DB_USER");
if (databaseUrl) {
  try {
    const db = new URL(databaseUrl);
    if (["localhost", "127.0.0.1"].includes(db.hostname)) failures.push("Production DATABASE_URL must not point to loopback");
    const sslAccept = (db.searchParams.get("sslaccept") ?? "").toLowerCase();
    if (databaseTlsMode === "verify-identity" || databaseTlsMode === "verify-ca") {
      if (sslAccept !== "strict") failures.push("DATABASE_URL must use sslaccept=strict for verified TLS mode");
    } else if (databaseTlsMode === "required" && !["strict","accept_invalid_certs"].includes(sslAccept)) failures.push("DATABASE_URL must explicitly enable TLS for NCI_DATABASE_TLS_MODE=required");
  } catch {
    failures.push("DATABASE_URL must be a valid connection URL when configured");
  }
}

const storage = (process.env.DESIGN_STORAGE_DRIVER ?? process.env.BID_STORAGE_DRIVER ?? "filesystem").trim().toLowerCase();
if (!["filesystem", "supabase"].includes(storage)) failures.push("Private storage driver must be filesystem or supabase");
if (storage === "supabase") {
  const url = process.env.DESIGN_SUPABASE_URL?.trim() || process.env.BID_SUPABASE_URL?.trim();
  const key = process.env.DESIGN_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.BID_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.DESIGN_SUPABASE_BUCKET?.trim() || process.env.BID_SUPABASE_BUCKET?.trim();
  if (!url || !key || !bucket) failures.push("Private Supabase storage requires URL, service-role key and bucket");
} else {
  const root = process.env.DESIGN_PRIVATE_STORAGE_ROOT?.trim() || process.env.BID_PRIVATE_STORAGE_ROOT?.trim();
  if (!root) failures.push("Private filesystem storage root is required");
  else if (!path.isAbsolute(root)) failures.push("Private filesystem storage root must be an absolute path");
  else {
    const resolvedRoot = path.resolve(root);
    const publicDir = path.resolve(process.cwd(), "public");
    if (resolvedRoot === publicDir || resolvedRoot.startsWith(`${publicDir}${path.sep}`)) failures.push("Private filesystem storage root must be outside the public directory");
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`BLOCKER: ${failure}`);
  process.exit(1);
}
console.log("Production Release Gate environment checks passed.");
