import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

const querySchema = z.object({
  actorMbox: z.string().optional(),
  verbId: z.string().optional(),
  objectId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    actorMbox: url.searchParams.get("actorMbox") ?? undefined,
    verbId: url.searchParams.get("verbId") ?? undefined,
    objectId: url.searchParams.get("objectId") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { actorMbox, verbId, objectId, take, cursor } = parsed.data;
  const pageSize = take ?? 50;

  const items = await prisma.xapiStatement.findMany({
    where: {
      tenantId: session.tenantId,
      ...(actorMbox ? { actorMbox } : {}),
      ...(verbId ? { verbId } : {}),
      ...(objectId ? { objectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

  const hasMore = items.length > pageSize;
  const page = hasMore ? items.slice(0, pageSize) : items;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  return NextResponse.json({ items: page, nextCursor });
}

