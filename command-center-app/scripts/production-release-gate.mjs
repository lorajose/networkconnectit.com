const required = ["NEXTAUTH_URL", "NEXTAUTH_SECRET"];
const expectedBasePath = "/tools/command-center";
const failures = [];
const warnings = [];

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
if (basePath !== expectedBasePath) failures.push(`NEXT_PUBLIC_APP_BASE_PATH must be ${expectedBasePath} for Production Release Gate 1`);
if (authUrl) {
  try {
    const url = new URL(authUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") failures.push("NEXTAUTH_URL must use HTTPS in production");
    const expected = `${basePath}/api/auth`.replace(/\/+/g, "/");
    if (!url.pathname.endsWith(expected)) failures.push(`NEXTAUTH_URL path must end with ${expected}`);
  } catch {
    failures.push("NEXTAUTH_URL must be a valid URL");
  }
}

const namespacedBootstrap = (process.env.NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP ?? "").trim();
if (namespacedBootstrap && !["false", "0", "no", "off", "disabled"].includes(namespacedBootstrap.toLowerCase())) {
  failures.push("NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP must be disabled when present");
}
if ((process.env.ENABLE_FIRST_ADMIN_BOOTSTRAP ?? "").toLowerCase() !== "false") {
  failures.push("ENABLE_FIRST_ADMIN_BOOTSTRAP must be false");
}
if ((process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN ?? "").trim()) {
  failures.push("FIRST_ADMIN_BOOTSTRAP_TOKEN must be empty/removed");
}
if ((process.env.NCI_RECOVER_NCI049 ?? "").trim() === "1") failures.push("NCI_RECOVER_NCI049 recovery flag must be disabled for release");
if ((process.env.NCI_RECOVER_ALERT_SCHEMA ?? "").trim() === "1") failures.push("NCI_RECOVER_ALERT_SCHEMA recovery flag must be disabled for release");

const nodeEnv = (process.env.NODE_ENV ?? "").trim().toLowerCase();
if (nodeEnv !== "production") failures.push("NODE_ENV must be production");
if ((process.env.DATABASE_ADMIN_URL ?? "").trim()) failures.push("DATABASE_ADMIN_URL must not be configured in production");

const storage = (process.env.BID_STORAGE_DRIVER ?? "filesystem").trim().toLowerCase();
if (!["filesystem", "supabase"].includes(storage)) failures.push("BID_STORAGE_DRIVER must be filesystem or supabase");
if (storage === "supabase") {
  for (const name of ["BID_SUPABASE_URL", "BID_SUPABASE_SERVICE_ROLE_KEY", "BID_SUPABASE_BUCKET"]) {
    if (!(process.env[name]?.trim())) failures.push(`${name} is required when BID_STORAGE_DRIVER=supabase`);
  }
} else if (storage === "filesystem" && !(process.env.BID_PRIVATE_STORAGE_ROOT?.trim())) {
  failures.push("BID_PRIVATE_STORAGE_ROOT is required when BID_STORAGE_DRIVER=filesystem");
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`BLOCKER: ${failure}`);
  process.exit(1);
}
console.log("Production Release Gate environment checks passed.");
