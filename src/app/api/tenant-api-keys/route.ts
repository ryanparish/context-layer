import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import {
  generateTenantApiKeyPlaintext,
  hashTenantApiKey,
  tenantApiKeyHintLast4,
} from "@/server/auth/apiKeyCrypto";
import { requireSession } from "@/server/auth/requireSession";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

async function requireSessionOwnerOrAdmin() {
  const session = await requireSession().catch(() => null);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/**
 * List active API keys (session only — not available via Bearer).
 */
export async function GET() {
  const gate = await requireSessionOwnerOrAdmin();
  if ("error" in gate) return gate.error;

  const keys = await prisma.tenantApiKey.findMany({
    where: { tenantId: gate.session.tenantId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      hintLast4: true,
      createdAt: true,
      lastUsedAt: true,
      createdByUserId: true,
    },
  });

  return NextResponse.json({ keys });
}

/**
 * Create key; returns `plaintext` once. Session only (OWNER or ADMIN).
 */
export async function POST(req: Request) {
  const gate = await requireSessionOwnerOrAdmin();
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const plain = generateTenantApiKeyPlaintext();
  let keyHash: string;
  let hintLast4: string;
  try {
    keyHash = hashTenantApiKey(plain);
    hintLast4 = tenantApiKeyHintLast4(plain);
  } catch (e) {
    console.error("[tenant-api-keys] hash failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not derive key material (check APP_ENCRYPTION_KEY)." },
      { status: 500 },
    );
  }

  try {
    const row = await prisma.tenantApiKey.create({
      data: {
        tenantId: gate.session.tenantId,
        name: parsed.data.name.trim(),
        keyHash,
        hintLast4,
        createdByUserId: gate.session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, createdAt: true, hintLast4: true },
    });

    return NextResponse.json({
      key: { ...row, plaintext: plain },
      message: "Copy the secret now; it will not be shown again.",
    });
  } catch (e) {
    console.error("[tenant-api-keys] create failed", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const missingTenantApiKey =
        e.code === "P2021" ||
        /TenantApiKey|tenant_api_key/i.test(e.message) ||
        (e.message.includes("does not exist") && e.message.includes("relation"));
      if (missingTenantApiKey) {
        return NextResponse.json(
          {
            error:
              'Database table "TenantApiKey" is missing. Run `npm run db:bootstrap` (or apply migration 20260402_tenant_api_keys) and restart the server.',
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: `Database error (${e.code}): ${e.message}` }, { status: 500 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create API key" },
      { status: 500 },
    );
  }
}
