import fs from "node:fs";
import path from "node:path";

const engineName = "libquery_engine-linux-musl-openssl-3.0.x.so.node";
const source = path.join(process.cwd(), "node_modules", ".prisma", "client", engineName);
const targetDir = path.join(process.cwd(), ".next", "standalone", "prisma-engine");
const target = path.join(targetDir, engineName);

if (!fs.existsSync(source)) {
  console.error(`Missing generated Prisma engine: ${source}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Copied Prisma musl/OpenSSL 3 engine to ${target}`);
