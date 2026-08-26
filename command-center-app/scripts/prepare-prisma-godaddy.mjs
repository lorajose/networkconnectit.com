import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes('binaryTargets = ["native", "debian-openssl-3.0.x"]')) {
  process.exit(0);
}

const updated = schema.replace(
  'generator client {\n  provider = "prisma-client-js"\n}',
  'generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-3.0.x"]\n}'
);

if (updated === schema) {
  console.error("Unable to patch Prisma generator block for GoDaddy runtime.");
  process.exit(1);
}

fs.writeFileSync(schemaPath, updated);
console.log("Prepared Prisma schema for GoDaddy Linux/OpenSSL 3 runtime.");
