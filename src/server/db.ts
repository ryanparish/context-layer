import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/server/env";

getEnv();

declare global {
  var prisma: PrismaClient | undefined;
}

let prodClient: PrismaClient | undefined;

/** True if this client includes the TenantApiKey model (after prisma generate). */
function prismaHasTenantApiKey(client: PrismaClient | undefined): boolean {
  return (
    !!client &&
    typeof (client as unknown as { tenantApiKey?: { create: unknown } }).tenantApiKey?.create === "function"
  );
}

function missingTenantApiKeyHelp(): Error {
  return new Error(
    "Prisma Client is missing TenantApiKey. Stop the dev server, run `npx prisma generate`, then start again.",
  );
}

/**
 * In development, `globalThis.prisma` can survive HMR while the on-disk generated client gains new models,
 * leaving `prisma.tenantApiKey` undefined. Recreate the client when that happens.
 */
function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    if (prodClient && prismaHasTenantApiKey(prodClient)) {
      return prodClient;
    }
    if (prodClient) {
      void prodClient.$disconnect().catch(() => {});
      prodClient = undefined;
    }
    const next = new PrismaClient();
    if (!prismaHasTenantApiKey(next)) {
      throw missingTenantApiKeyHelp();
    }
    prodClient = next;
    return next;
  }

  const existing = globalThis.prisma;
  if (existing && prismaHasTenantApiKey(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => {});
    globalThis.prisma = undefined;
  }
  const next = new PrismaClient();
  if (!prismaHasTenantApiKey(next)) {
    throw missingTenantApiKeyHelp();
  }
  globalThis.prisma = next;
  return next;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client) as unknown;
    if (typeof value === "function") {
      return (value as (...a: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
