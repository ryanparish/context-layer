import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import { ConnectionCredentials } from "@/server/connectors/types";

const VOID_VERB = "http://adlnet.gov/expapi/verbs/voided";

const bodySchema = z.object({
  connectionId: z.string().min(1),
  voidedStatementId: z.string().min(1),
  /** Actor for the voiding statement — should match the original statement’s actor (xAPI practice). */
  actor: z.record(z.string(), z.unknown()),
});

function validateVoidStatementShape(statement: Record<string, unknown>): { ok: true } | { ok: false; error: string } {
  const actor = statement.actor;
  if (!actor || typeof actor !== "object" || Array.isArray(actor)) {
    return { ok: false, error: "Void statement requires an actor object." };
  }
  const verb = statement.verb as Record<string, unknown> | undefined;
  if (typeof verb?.id !== "string" || verb.id !== VOID_VERB) {
    return { ok: false, error: "Void statement must use the voided verb." };
  }
  const obj = statement.object as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") {
    return { ok: false, error: "Void statement requires object." };
  }
  if (obj.objectType !== "StatementRef") {
    return { ok: false, error: "Void statement object must have objectType StatementRef." };
  }
  if (typeof obj.id !== "string" || !obj.id.trim()) {
    return { ok: false, error: "StatementRef id (target statement id) is required." };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const connection = await prisma.connection.findFirst({
    where: { id: parsed.data.connectionId, tenantId: session.tenantId },
    include: { secret: true },
  });
  if (!connection?.secret) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  if (connection.type !== "lrs_xapi_basic") {
    return NextResponse.json(
      { error: "Only xAPI LRS (Basic auth) connections can post void statements." },
      { status: 400 },
    );
  }

  const voidStatement: Record<string, unknown> = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor: parsed.data.actor,
    verb: {
      id: VOID_VERB,
      display: { "en-US": "voided" },
    },
    object: {
      objectType: "StatementRef",
      id: parsed.data.voidedStatementId.trim(),
    },
  };

  const shape = validateVoidStatementShape(voidStatement);
  if (!shape.ok) {
    return NextResponse.json({ ok: false, error: shape.error }, { status: 400 });
  }

  const decrypted = await decryptJson<{ credentials: ConnectionCredentials; options: Record<string, unknown> }>(
    connection.secret.cipherText,
  );
  if (decrypted.credentials.authType !== "BASIC") {
    return NextResponse.json({ error: "LRS connection must use BASIC auth" }, { status: 400 });
  }

  const lrsBaseUrl = String(decrypted.options?.lrsBaseUrl ?? "");
  if (!lrsBaseUrl.trim()) {
    return NextResponse.json({ error: "LRS base URL missing on this connection" }, { status: 400 });
  }

  let url: string;
  try {
    url = lrsStatementsPostUrl(lrsBaseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid LRS endpoint URL on this connection" }, { status: 400 });
  }

  const user = decrypted.credentials.username.trim();
  const pass = decrypted.credentials.password.trim();
  const auth = "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25_000);

  let lrsRes: Response;
  try {
    lrsRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "X-Experience-API-Version": "1.0.3",
        Accept: "application/json, */*",
      },
      body: JSON.stringify(voidStatement),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : "LRS request failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
  clearTimeout(t);

  const responseText = await lrsRes.text();
  let responseJson: unknown = null;
  if (responseText) {
    try {
      responseJson = JSON.parse(responseText) as unknown;
    } catch {
      responseJson = responseText;
    }
  }

  const location = lrsRes.headers.get("location") ?? lrsRes.headers.get("Location");
  const versionHdr = lrsRes.headers.get("x-experience-api-version");

  let statementIds: string[] | null = null;
  if (Array.isArray(responseJson)) {
    statementIds = responseJson.filter((x): x is string => typeof x === "string");
  }

  if (!lrsRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        httpStatus: lrsRes.status,
        error: `LRS returned HTTP ${lrsRes.status}`,
        body: responseJson,
        location,
        postUrl: url,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    httpStatus: lrsRes.status,
    voidingStatementId:
      statementIds?.[0] ?? (typeof voidStatement.id === "string" ? voidStatement.id : undefined),
    voidedStatementId: parsed.data.voidedStatementId.trim(),
    location,
    responseBody: responseJson,
    xExperienceApiVersion: versionHdr,
    postUrl: url,
    statementPosted: voidStatement,
  });
}
