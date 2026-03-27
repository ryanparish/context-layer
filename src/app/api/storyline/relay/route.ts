import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { prisma } from "@/server/db";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import { verifyStorylineToken } from "@/server/storyline/token";
import { extractXapiIndexFields } from "@/server/xapi/extract";
import { enqueueWorkflowsForStatement } from "@/server/workflows/engine";
import { ConnectionCredentials } from "@/server/connectors/types";

const relaySchema = z.object({
  token: z.string().min(10),
  bridgeId: z.string().min(1),
  verbIri: z.string().url(),
  objectIri: z.string().url(),
  actorMbox: z.string().email().optional(),
  vars: z.record(z.string(), z.unknown()).optional(),
});

function originAllowed(origin: string | null, allowed: string[]) {
  if (!allowed.length) return true;
  if (!origin) return false;
  return allowed.includes(origin);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const body = await req.json().catch(() => null);
  const parsed = relaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const bridge = await prisma.storylineBridge.findFirst({
    where: { id: parsed.data.bridgeId, enabled: true },
    include: {
      variables: true,
      connection: { include: { secret: true } },
    },
  });
  if (!bridge || !bridge.connection || !bridge.connection.secret) {
    return NextResponse.json({ error: "Bridge not found" }, { status: 404 });
  }

  if (!verifyStorylineToken(parsed.data.token, bridge.tokenHash)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!originAllowed(origin, bridge.allowedOrigins ?? [])) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (bridge.connection.type !== "lrs_xapi_basic") {
    return NextResponse.json({ error: "Bridge connection must be an LRS" }, { status: 400 });
  }

  const decrypted = await decryptJson<{ credentials: ConnectionCredentials; options: Record<string, unknown> }>(
    bridge.connection.secret.cipherText,
  );

  if (decrypted.credentials.authType !== "BASIC") {
    return NextResponse.json({ error: "LRS connection must use BASIC auth" }, { status: 400 });
  }

  const baseUrl = String(decrypted.options?.lrsBaseUrl ?? "");
  if (!baseUrl) return NextResponse.json({ error: "LRS baseUrl missing" }, { status: 400 });

  const actorMbox = parsed.data.actorMbox;
  if (!actorMbox) return NextResponse.json({ error: "actorMbox missing" }, { status: 400 });

  const nowIso = new Date().toISOString();
  const statementId = randomUUID();
  const statement = {
    id: statementId,
    timestamp: nowIso,
    actor: { objectType: "Agent", mbox: `mailto:${actorMbox}` },
    verb: { id: parsed.data.verbIri, display: { "en-US": parsed.data.verbIri.split("/").pop() ?? "did" } },
    object: { objectType: "Activity", id: parsed.data.objectIri },
    context: {
      extensions: {
        // Prisma's JSON type expects a JSON-serializable value (not `unknown`).
        "https://context-layer.app/storyline/vars": (parsed.data.vars ?? {}) as any,
      },
    },
  };

  // Forward to LRS via backend (keeps LRS creds off the client).
  const user = decrypted.credentials.username.trim();
  const pass = decrypted.credentials.password.trim();
  const auth = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

  let url: string;
  try {
    url = lrsStatementsPostUrl(baseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid LRS endpoint URL" }, { status: 400 });
  }

  const lrsRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "X-Experience-API-Version": "1.0.3",
    },
    body: JSON.stringify(statement),
  });

  if (!lrsRes.ok) {
    const text = await lrsRes.text().catch(() => "");
    return NextResponse.json(
      { error: `LRS rejected statement (HTTP ${lrsRes.status})`, details: text.slice(0, 2000) },
      { status: 502 },
    );
  }

  // Persist locally too, so it shows in the app dashboards/streams.
  const idx = extractXapiIndexFields(statement as any);
  const stored = await prisma.xapiStatement.create({
    data: {
      tenantId: bridge.tenantId,
      statement: statement as any,
      actorMbox: idx.actorMbox ?? undefined,
      verbId: idx.verbId ?? undefined,
      objectId: idx.objectId ?? undefined,
      occurredAt: idx.occurredAt ?? undefined,
    },
    select: { id: true },
  });

  await enqueueWorkflowsForStatement(stored.id);

  // OUT vars: let caller map return values back into Storyline vars.
  const outVars: Record<string, unknown> = {};
  for (const v of bridge.variables) {
    if (v.direction !== "OUT") continue;
    // For now just echo undefined keys unless a future action populates them.
    outVars[v.key] = null;
  }

  return NextResponse.json({ ok: true, statementId, outVars });
}

