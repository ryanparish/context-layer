import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { hashStorylineToken } from "@/server/storyline/token";

const variableSchema = z.object({
  key: z.string().min(1).max(64),
  direction: z.enum(["IN", "OUT"]),
  storylineName: z.string().min(1).max(80),
  jsonPath: z.string().min(1).max(200).optional(),
});

const createSchema = z.object({
  name: z.string().min(2).max(80),
  connectionId: z.string().min(1),
  allowedOrigins: z.array(z.string().min(1).max(200)).optional(),
  variables: z.array(variableSchema).optional(),
});

export async function GET(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bridges = await prisma.storylineBridge.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      connectionId: true,
      allowedOrigins: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
      variables: { select: { id: true, key: true, direction: true, storylineName: true, jsonPath: true } },
    },
  });

  return NextResponse.json({ bridges });
}

export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashStorylineToken(token);

  const created = await prisma.storylineBridge.create({
    data: {
      tenantId: session.tenantId,
      name: parsed.data.name,
      connectionId: parsed.data.connectionId,
      tokenHash,
      allowedOrigins: parsed.data.allowedOrigins ?? [],
      variables: parsed.data.variables?.length
        ? {
            create: parsed.data.variables.map((v) => ({
              key: v.key,
              direction: v.direction,
              storylineName: v.storylineName,
              jsonPath: v.jsonPath ?? null,
            })),
          }
        : undefined,
    },
    select: { id: true, name: true, connectionId: true, allowedOrigins: true, enabled: true, createdAt: true },
  });

  // Token is only returned once (store it somewhere safe).
  return NextResponse.json({ bridge: created, token }, { status: 201 });
}

