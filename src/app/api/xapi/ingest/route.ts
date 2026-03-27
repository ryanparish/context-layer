import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { extractXapiIndexFields } from "@/server/xapi/extract";
import { enqueueWorkflowsForStatement } from "@/server/workflows/engine";

const ingestSchema = z.object({
  statement: z.unknown(),
});

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const statement = parsed.data.statement as any;
  const idx = extractXapiIndexFields(statement);

  const created = await prisma.xapiStatement.create({
    data: {
      tenantId: session.tenantId,
      statement,
      actorMbox: idx.actorMbox ?? undefined,
      verbId: idx.verbId ?? undefined,
      objectId: idx.objectId ?? undefined,
      occurredAt: idx.occurredAt ?? undefined,
    },
    select: {
      id: true,
      createdAt: true,
      actorMbox: true,
      verbId: true,
      objectId: true,
      occurredAt: true,
      statement: true,
    },
  });

  await enqueueWorkflowsForStatement(created.id);

  return NextResponse.json({ statement: created }, { status: 201 });
}

