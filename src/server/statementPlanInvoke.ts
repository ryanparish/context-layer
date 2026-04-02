import type { z } from "zod";

import { fieldRefSchema, statementPlanMappingSchema } from "@/server/statementPlanXapi";

export type PlanFieldRefSpec =
  | { mappingField: string; mode: "literal"; value: string }
  | {
      mappingField: string;
      mode: "var";
      /** Dotted path into the `variables` object you POST (e.g. learner.email → { "learner": { "email": "..." } }). */
      variablePath: string;
    }
  | { mappingField: string; mode: "template"; templateId: string; templateName: string | null };

/**
 * Lists each mapping field that uses a field ref, for API documentation and validation hints.
 */
export function listPlanFieldRefSpecs(mapping: z.infer<typeof statementPlanMappingSchema>): PlanFieldRefSpec[] {
  const out: PlanFieldRefSpec[] = [];
  for (const [key, val] of Object.entries(mapping as Record<string, unknown>)) {
    if (key === "actorIfiType") continue;
    const parsed = fieldRefSchema.safeParse(val);
    if (!parsed.success) continue;
    const ref = parsed.data;
    if (ref.mode === "literal") {
      out.push({ mappingField: key, mode: "literal", value: ref.value });
    } else if (ref.mode === "var") {
      out.push({ mappingField: key, mode: "var", variablePath: ref.value });
    } else {
      out.push({
        mappingField: key,
        mode: "template",
        templateId: ref.value,
        templateName: null,
      });
    }
  }
  return out;
}
