import fs from "node:fs";
import path from "node:path";

const engineName = "libquery_engine-linux-musl-openssl-3.0.x.so.node";
const source = path.join(process.cwd(), "node_modules", ".prisma", "client", engineName);
const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const targetDir = path.join(standaloneDir, "prisma-engine");
const target = path.join(targetDir, engineName);
const staticSource = path.join(process.cwd(), ".next", "static");
const staticTarget = path.join(standaloneDir, ".next", "static");
const publicSource = path.join(process.cwd(), "public");
const publicTarget = path.join(standaloneDir, "public");

if (!fs.existsSync(source)) {
  console.error(`Missing generated Prisma engine: ${source}`);
  process.exit(1);
}

if (!fs.existsSync(standaloneDir)) {
  console.error(`Missing Next.js standalone output: ${standaloneDir}`);
  process.exit(1);
}

if (!fs.existsSync(staticSource)) {
  console.error(`Missing Next.js static assets: ${staticSource}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Copied Prisma musl/OpenSSL 3 engine to ${target}`);

fs.rmSync(staticTarget, { recursive: true, force: true });
fs.mkdirSync(path.dirname(staticTarget), { recursive: true });
fs.cpSync(staticSource, staticTarget, { recursive: true });
console.log(`Copied Next.js static assets to ${staticTarget}`);

if (fs.existsSync(publicSource)) {
  fs.rmSync(publicTarget, { recursive: true, force: true });
  fs.cpSync(publicSource, publicTarget, { recursive: true });
  console.log(`Copied public assets to ${publicTarget}`);
}
