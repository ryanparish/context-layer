import type { z } from "zod";

import { prisma } from "@/server/db";
import { buildUriFromTemplate, uriSegmentsSchema } from "@/server/uriLibrary";
import { statementPlanMappingSchema } from "@/server/xapiStatementPlan";

/**
 * For each field in the plan mapping with mode "template", resolves the URI template
 * to an IRI using `variables` (same object as Storyline / variable JSON).
 */
export async function resolveTemplateUrisForMapping(
  mapping: z.infer<typeof statementPlanMappingSchema>,
  variables: Record<string, unknown>,
  tenantId: string,
): Promise<Record<string, string>> {
  const ids = new Set<string>();
  for (const [k, v] of Object.entries(mapping as Record<string, unknown>)) {
    if (k === "actorIfiType") continue;
    if (v && typeof v === "object" && v !== null && "mode" in v && (v as { mode: string }).mode === "template") {
      const id = String((v as { value: string }).value ?? "").trim();
      if (id) ids.add(id);
    }
  }

  const out: Record<string, string> = {};
  for (const id of ids) {
    const t = await prisma.uriTemplate.findFirst({ where: { id, tenantId } });
    if (!t) {
      throw new Error(`URI template not found (id: ${id}).`);
    }
    const segments = uriSegmentsSchema.parse(t.segments);
    try {
      out[id] = buildUriFromTemplate(t.baseUrl, segments, variables);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Template resolution failed";
      throw new Error(`Template "${t.name || id}": ${msg}`);
    }
  }
  return out;
}
