import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";

function fail(message: string) {
  // eslint-disable-next-line no-console
  console.error(`✖ ${message}`);
  process.exit(1);
}

function ok(message: string) {
  // eslint-disable-next-line no-console
  console.log(`✔ ${message}`);
}

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const force = (process.env.FORCE_CLEAR_ACCOUNTS ?? "").toLowerCase() === "true";

  if (nodeEnv === "production" && !force) {
    fail(
      'Refusing to clear accounts in production. If you really mean it, set FORCE_CLEAR_ACCOUNTS=true for this command.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.tenant.deleteMany({});
    ok(`Deleted ${result.count} tenant(s) (and cascaded dependent records).`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : "Clear accounts failed"));

