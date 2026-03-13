import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-prisma.mjs <prisma-args...>");
  process.exit(1);
}

const cwd = process.cwd();
const envFileCandidates = [".env.local", ".env"];

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    parsed[key] = unquote(value);
  }

  return parsed;
}

const fileEnv = envFileCandidates.reduce((accumulator, fileName) => {
  return {
    ...accumulator,
    ...loadEnvFile(path.join(cwd, fileName))
  };
}, {});

const env = {
  ...fileEnv,
  ...process.env
};

const requiresDatabaseUrl = args[0] !== "generate";
const isMigrateDevCommand = args[0] === "migrate" && args[1] === "dev";

if (requiresDatabaseUrl && !env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Create .env.local from .env.example or export DATABASE_URL before running Prisma commands."
  );
  process.exit(1);
}

if (isMigrateDevCommand && env.DATABASE_ADMIN_URL) {
  env.DATABASE_URL = env.DATABASE_ADMIN_URL;
}

const result = spawnSync(npmCommand, ["exec", "prisma", "--", ...args], {
  cwd,
  env,
  stdio: "inherit"
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
