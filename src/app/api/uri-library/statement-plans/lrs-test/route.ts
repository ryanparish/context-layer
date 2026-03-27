import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import { ConnectionCredentials } from "@/server/connectors/types";
import { resolveTemplateUrisForMapping } from "@/server/statementPlanTemplateUris";
import {
  buildStatementPreview,
  statementPlanMappingSchema,
  validateStatementAgainstSpec,
} from "@/server/xapiStatementPlan";

const bodySchema = z
  .object({
    connectionId: z.string().min(1),
    mapping: statementPlanMappingSchema.optional(),
    variables: z.record(z.string(), z.unknown()).default({}),
    statement: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.statement && !data.mapping) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either mapping (with variables) or a statement object.",
      });
    }
  });

function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(omitUndefinedDeep).filter((v) => v !== undefined);
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const next = omitUndefinedDeep(v);
    if (next !== undefined) out[k] = next as unknown;
  }
  return out;
}

function validateStatementForLrs(statement: Record<string, unknown>) {
  const { errors } = validateStatementAgainstSpec(statement);
  if (errors.length === 0) return { ok: true as const };
  return { ok: false as const, error: errors.join("; ") };
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
      {
        error:
          "Only xAPI LRS (Basic auth) connections can post statements. Add one under Connections using the LRS preset.",
      },
      { status: 400 },
    );
  }

  let statement: Record<string, unknown>;
  if (parsed.data.statement) {
    statement = { ...parsed.data.statement };
  } else if (parsed.data.mapping) {
    let templateUris: Record<string, string> = {};
    try {
      templateUris = await resolveTemplateUrisForMapping(
        parsed.data.mapping,
        parsed.data.variables,
        session.tenantId,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Template resolution failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    statement = buildStatementPreview(parsed.data.mapping, parsed.data.variables, templateUris) as Record<
      string,
      unknown
    >;
  } else {
    return NextResponse.json({ error: "Missing statement or mapping" }, { status: 400 });
  }

  if (!statement.id) statement.id = randomUUID();

  const cleaned = omitUndefinedDeep(statement) as Record<string, unknown>;
  const shape = validateStatementForLrs(cleaned);
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
      body: JSON.stringify(cleaned),
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
  const consistent = lrsRes.headers.get("x-experience-api-consistent-through");
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
    statementId: statementIds?.[0] ?? (typeof cleaned.id === "string" ? cleaned.id : undefined),
    location,
    responseBody: responseJson,
    xExperienceApiVersion: versionHdr,
    xExperienceApiConsistentThrough: consistent,
    postUrl: url,
    statementPosted: cleaned,
  });
}
