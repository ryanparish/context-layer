import "dotenv/config";
import { spawnSync } from "node:child_process";

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

console.log("==> Applying base schema (safe to skip if already present)");
const initStatus = runPrisma([
  "db",
  "execute",
  "--file",
  "prisma/migrations/20260325_init/migration.sql",
  "--schema",
  "prisma/schema.prisma",
]);
if (initStatus !== 0) {
  console.log("==> Base schema already exists or could not be re-applied; continuing...");
}

console.log("==> Applying platform updates (idempotent)");
const patchStatus = runPrisma([
  "db",
  "execute",
  "--file",
  "prisma/migrations/20260326_platform_updates/migration.sql",
  "--schema",
  "prisma/schema.prisma",
]);

if (patchStatus !== 0) {
  console.error("==> Failed applying platform update migration.");
  process.exit(1);
}

console.log("==> Applying URI library migration (idempotent)");
const uriLibraryStatus = runPrisma([
  "db",
  "execute",
  "--file",
  "prisma/migrations/20260326_uri_library/migration.sql",
  "--schema",
  "prisma/schema.prisma",
]);

if (uriLibraryStatus !== 0) {
  console.error("==> Failed applying URI library migration.");
  process.exit(1);
}

console.log("==> Applying statement plan migration (idempotent)");
const statementPlanStatus = runPrisma([
  "db",
  "execute",
  "--file",
  "prisma/migrations/20260326_statement_plans/migration.sql",
  "--schema",
  "prisma/schema.prisma",
]);

if (statementPlanStatus !== 0) {
  console.error("==> Failed applying statement plan migration.");
  process.exit(1);
}

console.log("==> Applying verb description migration (idempotent)");
const verbDescriptionStatus = runPrisma([
  "db",
  "execute",
  "--file",
  "prisma/migrations/20260326_verb_descriptions/migration.sql",
  "--schema",
  "prisma/schema.prisma",
]);

if (verbDescriptionStatus !== 0) {
  console.error("==> Failed applying verb description migration.");
  process.exit(1);
}

console.log("==> Database bootstrap complete.");
