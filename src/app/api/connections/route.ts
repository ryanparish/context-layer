import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { encryptJson } from "@/server/crypto/secrets";

const createConnectionSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.string().min(2).max(100),
  authType: z.enum(["API_KEY", "BASIC", "OAUTH2"]),
  credentials: z.unknown(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.connection.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      authType: true,
      status: true,
      lastSyncAt: true,
      syncEnabled: true,
      syncCron: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ connections });
}

export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, type, authType, credentials, options } = parsed.data;

  const cipherText = await encryptJson({ credentials, options: options ?? {} });
  const secret = await prisma.secret.create({
    data: {
      tenantId: session.tenantId,
      label: `${name} credentials`,
      cipherText,
    },
  });

  const connection = await prisma.connection.create({
    data: {
      tenantId: session.tenantId,
      name,
      type,
      authType,
      secretId: secret.id,
      status: "CONNECTED",
    },
    select: {
      id: true,
      name: true,
      type: true,
      authType: true,
      status: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ connection }, { status: 201 });
}

