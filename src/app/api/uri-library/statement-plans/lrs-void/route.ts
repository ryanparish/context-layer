import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import type { ConnectionCredentials } from "@/server/connectors/types";

const voidBodySchema = z.object({
  connectionId: z.string().min(1),
  voidedStatementId: z.string().min(1),
  actor: z.record(z.string(), z.unknown()),
});

export const runtime = "nodejs";

/**
 * POST a voiding statement to the LRS (references a StatementRef), for planner live-test cleanup.
 */
export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = voidBodySchema.safeParse(body);
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
      { error: "connectionId must be an xAPI LRS (Basic) connection" },
      { status: 400 },
    );
  }

  const decrypted = await decryptJson<{ credentials: ConnectionCredentials; options: Record<string, unknown> }>(
    connection.secret.cipherText,
  );
  if (decrypted.credentials.authType !== "BASIC") {
    return NextResponse.json({ error: "LRS connection must use BASIC auth" }, { status: 400 });
  }

  const lrsBaseUrl = String(decrypted.options?.lrsBaseUrl ?? "");
  if (!lrsBaseUrl.trim()) {
    return NextResponse.json({ error: "LRS endpoint URL missing on this connection" }, { status: 400 });
  }

  let url: string;
  try {
    url = lrsStatementsPostUrl(lrsBaseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid LRS endpoint URL" }, { status: 400 });
  }

  const user = decrypted.credentials.username.trim();
  const pass = decrypted.credentials.password.trim();
  const auth = "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

  const voidStatement = {
    id: randomUUID(),
    actor: parsed.data.actor,
    verb: {
      id: "http://adlnet.gov/expapi/verbs/voided",
      display: { "en-US": "voided" },
    },
    object: {
      objectType: "StatementRef",
      id: parsed.data.voidedStatementId,
    },
  };

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
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "LRS request failed",
        postUrl: url,
        statementId: voidStatement.id,
      },
      { status: 502 },
    );
  }

  const responseText = await lrsRes.text();
  let responseBody: unknown = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText) as unknown;
    } catch {
      responseBody = responseText;
    }
  }
  const location = lrsRes.headers.get("location") ?? lrsRes.headers.get("Location");

  if (!lrsRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        httpStatus: lrsRes.status,
        error: `LRS returned HTTP ${lrsRes.status}`,
        body: responseBody,
        postUrl: url,
        statementId: voidStatement.id,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    statementId: voidStatement.id,
    voidedStatementId: parsed.data.voidedStatementId,
    postUrl: url,
    httpStatus: lrsRes.status,
    responseBody,
    location,
  });
}
