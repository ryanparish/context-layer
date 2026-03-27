import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { decryptJson } from "@/server/crypto/secrets";
import { lrsStatementsPostUrl } from "@/server/connectors/lrsUrl";
import { ConnectionCredentials } from "@/server/connectors/types";
import { buildGenericXapiTestStatement } from "@/server/xapi/genericTestStatement";

/**
 * POST a minimal valid xAPI statement to the real LRS (same as production traffic).
 * Used to validate Basic auth + endpoint for SCORM Cloud and other LRSs.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const connection = await prisma.connection.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { secret: true },
  });
  if (!connection?.secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (connection.type !== "lrs_xapi_basic") {
    return NextResponse.json(
      { error: "POST validation is only available for xAPI LRS (Basic) connections." },
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
  const statement = buildGenericXapiTestStatement();

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
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    httpStatus: lrsRes.status,
    postUrl: url,
    statementId: statement.id,
    responseBody,
    location,
    message:
      "Validation statement accepted by the LRS. You should see this statement id in your LRS if you query recent activity.",
  });
}
