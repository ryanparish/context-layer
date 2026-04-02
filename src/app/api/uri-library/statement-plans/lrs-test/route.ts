import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import type { ConnectionCredentials } from "@/server/connectors/types";
import { resolveTemplateUrisForMapping } from "@/server/statementPlanTemplateUris";
import {
  buildStatementPreview,
  statementPlanMappingSchema,
  validateStatementAgainstSpec,
} from "@/server/statementPlanXapi";

const lrsTestBodySchema = z.object({
  connectionId: z.string().min(1),
  mapping: statementPlanMappingSchema,
  variables: z.record(z.string(), z.unknown()).default({}),
});

export const runtime = "nodejs";

/**
 * POST — Build statement from mapping + variables and POST to the tenant LRS (planner live test).
 */
export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = lrsTestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const variables = parsed.data.variables as Record<string, unknown>;
  const mapping = parsed.data.mapping;

  let templateUris: Record<string, string>;
  try {
    templateUris = await resolveTemplateUrisForMapping(mapping, variables, session.tenantId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Template resolution failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const preview = buildStatementPreview(mapping, variables, templateUris);
  const statement = { ...preview, id: randomUUID() } as Record<string, unknown>;

  const { errors, warnings } = validateStatementAgainstSpec(statement);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Statement validation failed", errors, warnings, statement },
      { status: 400 },
    );
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
      body: JSON.stringify(statement),
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "LRS request failed",
        postUrl: url,
        statementId: statement.id,
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
        statementId: statement.id,
        warnings,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    statementId: statement.id,
    statementPosted: statement,
    postUrl: url,
    httpStatus: lrsRes.status,
    responseBody,
    location,
    warnings: warnings.length ? warnings : undefined,
  });
}
