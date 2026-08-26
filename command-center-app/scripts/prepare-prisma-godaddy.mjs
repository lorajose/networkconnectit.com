import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const desiredTargets =
  'binaryTargets = ["native", "linux-musl-openssl-3.0.x"]';

if (schema.includes(desiredTargets)) {
  process.exit(0);
}

const updated = schema.replace(
  /generator client \{\n  provider\s+= "prisma-client-js"(?:\n  binaryTargets = \[[^\n]+\])?\n\}/,
  `generator client {\n  provider      = "prisma-client-js"\n  ${desiredTargets}\n}`
);

if (updated === schema) {
  console.error("Unable to patch Prisma generator block for GoDaddy runtime.");
  process.exit(1);
}

fs.writeFileSync(schemaPath, updated);
console.log("Prepared Prisma schema for GoDaddy musl/OpenSSL 3 runtime.");
