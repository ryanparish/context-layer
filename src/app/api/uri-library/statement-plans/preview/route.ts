import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/server/auth/requireSession";
import { resolveTemplateUrisForMapping } from "@/server/statementPlanTemplateUris";
import {
  buildStatementPreview,
  statementPlanMappingSchema,
  validateStatementAgainstSpec,
} from "@/server/xapiStatementPlan";

const previewSchema = z.object({
  mapping: statementPlanMappingSchema,
  variables: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  let templateUris: Record<string, string> = {};
  try {
    templateUris = await resolveTemplateUrisForMapping(
      parsed.data.mapping,
      parsed.data.variables,
      session.tenantId,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Template resolution failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const statement = buildStatementPreview(parsed.data.mapping, parsed.data.variables, templateUris);
  const specValidation = validateStatementAgainstSpec(statement);
  return NextResponse.json({ statement, specValidation });
}

