import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

function runPrisma(args) {
  return run("npx", ["prisma", ...args]);
}

console.log("==> Trying prisma migrate deploy");
const deployStatus = runPrisma(["migrate", "deploy"]);
if (deployStatus === 0) {
  console.log("==> Migrations applied successfully.");
  process.exit(0);
}

console.log("==> Deploy failed, applying compatibility fallback...");
console.log("    (for existing local DBs that predate _prisma_migrations)");

if (
  runPrisma([
    "db",
    "execute",
    "--file",
    "prisma/migrations/20260326_platform_updates/migration.sql",
    "--schema",
    "prisma/schema.prisma",
  ]) !== 0
) {
  process.exit(1);
}

// Mark migrations as applied so future deploys are deterministic.
runPrisma(["migrate", "resolve", "--applied", "20260325_init"]);
runPrisma(["migrate", "resolve", "--applied", "20260326_platform_updates"]);

console.log("==> Re-running prisma migrate deploy");
if (runPrisma(["migrate", "deploy"]) !== 0) process.exit(1);

console.log("==> Database is now aligned with migrations.");
