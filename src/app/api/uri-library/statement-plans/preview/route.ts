import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveTenantContext } from "@/server/auth/tenantContext";
import { resolveTemplateUrisForMapping } from "@/server/statementPlanTemplateUris";
import {
  buildStatementPreview,
  statementPlanMappingSchema,
  validateStatementAgainstSpec,
} from "@/server/statementPlanXapi";

const previewBodySchema = z.object({
  mapping: statementPlanMappingSchema,
  variables: z.record(z.string(), z.unknown()).default({}),
});

export const runtime = "nodejs";

/**
 * POST — Build statement JSON from mapping + variables (no LRS). Used by URI Library planner preview.
 */
export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = previewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  let templateUris: Record<string, string>;
  try {
    templateUris = await resolveTemplateUrisForMapping(
      parsed.data.mapping,
      parsed.data.variables as Record<string, unknown>,
      session.tenantId,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Template resolution failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const statement = buildStatementPreview(
    parsed.data.mapping,
    parsed.data.variables as Record<string, unknown>,
    templateUris,
  ) as Record<string, unknown>;

  const specValidation = validateStatementAgainstSpec(statement);

  return NextResponse.json({ statement, specValidation });
}
