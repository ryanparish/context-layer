import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { decryptJson } from "@/server/crypto/secrets";
import { getConnectorAdapter } from "@/server/connectors/registry";
import { ConnectionCredentials } from "@/server/connectors/types";

const testSchema = z.object({
  overrideOptions: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const connection = await prisma.connection.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { secret: true },
  });
  if (!connection || !connection.secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const adapter = getConnectorAdapter(connection.type);
  if (!adapter) return NextResponse.json({ ok: false, error: "Unknown connector type" });

  const decrypted = await decryptJson<{ credentials: ConnectionCredentials; options: Record<string, unknown> }>(
    connection.secret.cipherText,
  );

  const result = await adapter.test(decrypted.credentials, {
    ...(decrypted.options ?? {}),
    ...(parsed.data.overrideOptions ?? {}),
  });

  return NextResponse.json(result, { status: 200 });
}

