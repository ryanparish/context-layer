import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: Request) {
  // Reuse /api/metrics behind the scenes so we have one source of truth.
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`event: hello\ndata: {}\n\n`));
    },
    async pull(controller) {
      if (closed) return;

      try {
        const url = new URL(req.url);
        url.pathname = "/api/metrics";
        url.search = "";

        const res = await fetch(url, {
          headers: { cookie: req.headers.get("cookie") ?? "" },
          cache: "no-store",
        });
        const data = await res.json();
        controller.enqueue(encoder.encode(`event: metrics\ndata: ${JSON.stringify(data)}\n\n`));
      } catch {
        controller.enqueue(encoder.encode(`event: metrics\ndata: {}\n\n`));
      }

      await sleep(2000);
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

