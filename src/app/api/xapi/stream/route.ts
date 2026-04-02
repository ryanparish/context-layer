import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;
  const sinceValid = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null;

  const encoder = new TextEncoder();

  let lastSeen = sinceValid ?? new Date(Date.now() - 60_000);
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`event: hello\ndata: {}\n\n`));
    },
    async pull(controller) {
      if (closed) return;

      const items = await prisma.xapiStatement.findMany({
        where: { tenantId: session.tenantId, createdAt: { gt: lastSeen } },
        orderBy: { createdAt: "asc" },
        take: 100,
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

      for (const item of items) {
        lastSeen = item.createdAt;
        controller.enqueue(
          encoder.encode(`event: statement\ndata: ${JSON.stringify(item)}\n\n`),
        );
      }

      if (items.length === 0) {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        await sleep(1000);
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

