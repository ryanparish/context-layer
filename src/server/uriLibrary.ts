import { z } from "zod";

export const uriSegmentSchema = z.object({
  type: z.enum(["static", "variable"]),
  value: z.string().min(1).max(120),
  sourceKey: z.string().min(1).max(120).optional(),
});

export const uriSegmentsSchema = z.array(uriSegmentSchema).max(50);

type Seg = z.infer<typeof uriSegmentSchema>;

function getByPath(obj: Record<string, unknown>, path: string) {
  const keys = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== "object" || !(key in (cur as Record<string, unknown>))) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function buildUriFromTemplate(
  baseUrl: string,
  segments: Seg[],
  vars: Record<string, unknown>,
) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) throw new Error("baseUrl is required");

  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.type === "static") {
      parts.push(encodeURIComponent(seg.value.trim()));
      continue;
    }
    const sourceKey = seg.sourceKey?.trim() || seg.value.trim();
    const raw = getByPath(vars, sourceKey);
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      throw new Error(`Missing variable for segment: ${sourceKey}`);
    }
    parts.push(encodeURIComponent(String(raw).trim()));
  }

  return `${base}/${parts.join("/")}`;
}

