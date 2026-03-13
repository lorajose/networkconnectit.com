import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const steps = [
  ["run", "prisma:generate"],
  ["run", "prisma:validate"],
  ["run", "prisma:migrate:dev", "--", "--name", "block-5-bootstrap"],
  ["run", "prisma:seed"]
];

for (const args of steps) {
  const result = spawnSync(npmCommand, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
