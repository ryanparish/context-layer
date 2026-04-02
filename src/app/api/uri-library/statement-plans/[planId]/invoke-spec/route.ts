import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { listPlanFieldRefSpecs } from "@/server/statementPlanInvoke";
import { statementPlanMappingSchema } from "@/server/statementPlanXapi";

/**
 * GET — Describe how to call POST …/invoke for this plan (for Postman / integrations).
 * Auth: `Authorization: Bearer <tenant API key>` (RFC 6750) or session cookie `ctx_session`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const plan = await prisma.xapiStatementPlan.findFirst({
    where: { id: planId, tenantId: session.tenantId },
  });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const parsed = statementPlanMappingSchema.safeParse(plan.mapping);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stored plan mapping is invalid", issues: parsed.error.issues },
      { status: 500 },
    );
  }

  const fieldRefs = listPlanFieldRefSpecs(parsed.data);
  const enriched = await Promise.all(
    fieldRefs.map(async (ref) => {
      if (ref.mode !== "template") return ref;
      const t = await prisma.uriTemplate.findFirst({
        where: { id: ref.templateId, tenantId: session.tenantId },
        select: { name: true },
      });
      return { ...ref, templateName: t?.name ?? null };
    }),
  );

  const variablePaths = enriched.filter((r) => r.mode === "var").map((r) => r.variablePath);
  const templateIds = [...new Set(enriched.filter((r) => r.mode === "template").map((r) => r.templateId))];

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return NextResponse.json({
    planId: plan.id,
    name: plan.name,
    description: plan.description,
    active: plan.active,
    uriTemplateId: plan.uriTemplateId,
    actorIfiType: parsed.data.actorIfiType,
    fieldRefs: enriched,
    summary: {
      variablePaths,
      templateIds,
      literalFields: enriched.filter((r) => r.mode === "literal").map((r) => r.mappingField),
    },
    post: {
      method: "POST",
      path: `/api/uri-library/statement-plans/${plan.id}/invoke`,
      absoluteUrl: base ? `${base}/api/uri-library/statement-plans/${plan.id}/invoke` : undefined,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer <tenant API key from Settings → API keys>",
        "Cookie (alternative)": "ctx_session=<browser session>",
      },
      body: {
        connectionId: "string (required) — id of a tenant Connection with type lrs_xapi_basic",
        variables:
          "object (required) — JSON used for mode:var paths (nested keys match dotted paths, e.g. learner.email → { \"learner\": { \"email\": \"...\" } }) and for URI template segments",
        storeLocally:
          "boolean (optional, default true) — also save the statement in xAPIvate and run workflow triggers",
      },
      /** Paste into Postman / curl; set `variables` from `summary.variablePaths` (nested JSON for dotted paths). */
      bodyExample: {
        connectionId: "<from GET /api/connections — type lrs_xapi_basic>",
        variables: {},
        storeLocally: true,
      },
    },
    notes: [
      "Recommended: create a tenant API key (Settings → API keys, OWNER/ADMIN only) and send Authorization: Bearer <secret>. Keys act as the creator’s user for permissions.",
      "Alternatively use the session cookie ctx_session from the browser after sign-in.",
      "List connections with GET /api/connections (same auth). Use an LRS connection’s id as connectionId.",
    ],
  });
}
