import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

const generateSchema = z.object({
  token: z.string().min(10),
  appBaseUrl: z.string().url(),
  verbIri: z.string().url(),
  objectIri: z.string().url(),
  actorMboxVarKey: z.string().min(1).max(64).optional(), // which IN variable key maps to actor mbox
});

function jsStringLiteral(value: string) {
  return JSON.stringify(value);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bridge = await prisma.storylineBridge.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true,
      name: true,
      variables: { select: { key: true, direction: true, storylineName: true } },
    },
  });
  if (!bridge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const inVars = bridge.variables.filter((v) => v.direction === "IN");
  const outVars = bridge.variables.filter((v) => v.direction === "OUT");

  const token = parsed.data.token;
  const actorMboxVarKey = parsed.data.actorMboxVarKey;

  const actorExpr = actorMboxVarKey
    ? `vars[${jsStringLiteral(actorMboxVarKey)}]`
    : "undefined";

  const relayUrl = new URL("/api/storyline/relay", parsed.data.appBaseUrl).toString();

  const code = [
    "/**",
    ` * xAPIvate Storyline Bridge: ${bridge.name}`,
    " * Paste into an Articulate Storyline 'Execute JavaScript' trigger.",
    " */",
    "(async function () {",
    "  try {",
    "    var player = GetPlayer();",
    "    var vars = {};",
    ...inVars.map(
      (v) =>
        `    vars[${jsStringLiteral(v.key)}] = player.GetVar(${jsStringLiteral(v.storylineName)});`,
    ),
    "",
    "    var res = await fetch(",
    `      ${jsStringLiteral(relayUrl)},`,
    "      {",
    "        method: 'POST',",
    "        headers: {",
    "          'content-type': 'application/json',",
    "        },",
    "        body: JSON.stringify({",
    `          token: ${jsStringLiteral(token)},`,
    `          bridgeId: ${jsStringLiteral(bridge.id)},`,
    `          verbIri: ${jsStringLiteral(parsed.data.verbIri)},`,
    `          objectIri: ${jsStringLiteral(parsed.data.objectIri)},`,
    `          actorMbox: ${actorExpr},`,
    "          vars: vars,",
    "        }),",
    "      }",
    "    );",
    "",
    "    var json = await res.json();",
    "    if (!res.ok) {",
    "      throw new Error((json && json.error) ? json.error : ('HTTP ' + res.status));",
    "    }",
    "",
    "    var out = (json && json.outVars) ? json.outVars : {};",
    ...outVars.map(
      (v) =>
        `    if (Object.prototype.hasOwnProperty.call(out, ${jsStringLiteral(v.key)})) player.SetVar(${jsStringLiteral(v.storylineName)}, out[${jsStringLiteral(v.key)}]);`,
    ),
    "  } catch (e) {",
    "    try { console.error(e); } catch (_) {}",
    "  }",
    "})();",
    "",
  ].join("\n");

  return NextResponse.json({ code });
}

