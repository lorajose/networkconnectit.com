import path from "node:path";

const failures = [];
const productionHost = "command.networkconnectit.com";
const runtimeEnv = (process.env.NCI_RUNTIME_ENV ?? "").trim().toLowerCase();
const nodeEnv = (process.env.NODE_ENV ?? "").trim().toLowerCase();

if (runtimeEnv !== "qa") failures.push("NCI_RUNTIME_ENV must be qa");
if (nodeEnv !== "production") failures.push("NODE_ENV must be production for the QA standalone runtime");

const authUrl = (process.env.NEXTAUTH_URL ?? "").trim();
if (!authUrl) failures.push("NEXTAUTH_URL is required");
else {
  try {
    const url = new URL(authUrl);
    if (url.protocol !== "https:") failures.push("QA NEXTAUTH_URL must use HTTPS");
    if (url.hostname === productionHost) failures.push(`QA NEXTAUTH_URL must not use production host ${productionHost}`);
    if (!url.pathname.endsWith("/api/auth")) failures.push("QA NEXTAUTH_URL path must end with /api/auth");
  } catch {
    failures.push("NEXTAUTH_URL must be a valid URL");
  }
}

const secret = (process.env.NEXTAUTH_SECRET ?? "").trim();
if (!secret || secret.length < 32 || /replace-with|changeme|example|secret/i.test(secret)) failures.push("NEXTAUTH_SECRET must be a strong non-placeholder value (32+ characters)");

for (const name of ["NCI_RECOVER_NCI049","NCI_RECOVER_NCI074","NCI_RECOVER_ALERT_SCHEMA"]) {
  if ((process.env[name] ?? "").trim() === "1") failures.push(`${name} must be disabled in QA`);
}
if ((process.env.DATABASE_ADMIN_URL ?? "").trim()) failures.push("DATABASE_ADMIN_URL must not be configured in QA");
if ((process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN ?? "").trim()) failures.push("FIRST_ADMIN_BOOTSTRAP_TOKEN must be empty/removed in QA");
if (!["","false","0","no","off","disabled"].includes((process.env.NCI_ALLOW_DEMO_SEED ?? "").trim().toLowerCase())) failures.push("NCI_ALLOW_DEMO_SEED must be disabled in QA");

const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
if (!databaseUrl) failures.push("QA DATABASE_URL is required");
else {
  try {
    const db = new URL(databaseUrl);
    if (["localhost","127.0.0.1","::1"].includes(db.hostname)) failures.push("QA DATABASE_URL must not point to loopback");
    const dbName = db.pathname.replace(/^\//, "").toLowerCase();
    if (!dbName || !/(qa|test|staging)/.test(dbName)) failures.push("QA database name must visibly identify qa, test, or staging");
  } catch {
    failures.push("QA DATABASE_URL must be a valid connection URL");
  }
}

const storage = (process.env.DESIGN_STORAGE_DRIVER ?? process.env.BID_STORAGE_DRIVER ?? "filesystem").trim().toLowerCase();
if (!["filesystem","supabase"].includes(storage)) failures.push("QA private storage driver must be filesystem or supabase");
if (storage === "filesystem") {
  const root = (process.env.DESIGN_PRIVATE_STORAGE_ROOT ?? process.env.BID_PRIVATE_STORAGE_ROOT ?? "").trim();
  if (!root) failures.push("QA private filesystem storage root is required");
  else if (!path.isAbsolute(root)) failures.push("QA private filesystem storage root must be absolute");
  else if (!/(qa|test|staging)/i.test(root)) failures.push("QA private filesystem storage root must visibly identify qa, test, or staging");
} else {
  const bucket = (process.env.DESIGN_SUPABASE_BUCKET ?? process.env.BID_SUPABASE_BUCKET ?? "").trim();
  if (!bucket || !/(qa|test|staging)/i.test(bucket)) failures.push("QA Supabase bucket must visibly identify qa, test, or staging");
}

if ((process.env.NCI_QA_ALLOW_MIGRATIONS ?? "").trim() === "1") failures.push("NCI_QA_ALLOW_MIGRATIONS is not accepted by runtime startup; run QA migrations separately");

if (failures.length) {
  for (const failure of failures) console.error(`BLOCKER: ${failure}`);
  process.exit(1);
}
console.log("QA runtime isolation gate checks passed.");
