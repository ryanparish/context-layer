import { z } from "zod";

/** literal = fixed string; var = dotted path into variables JSON; template = resolve a saved URI template id to an IRI. */
export const fieldRefSchema = z.union([
  z.object({ mode: z.literal("literal"), value: z.string().min(1).max(500) }),
  z.object({ mode: z.literal("var"), value: z.string().min(1).max(300) }),
  z.object({ mode: z.literal("template"), value: z.string().min(1) }),
]);

export const actorIfiTypeSchema = z.enum(["mbox", "mbox_sha1sum", "openid", "account"]);

export const statementPlanMappingSchema = z
  .object({
    actorIfiType: actorIfiTypeSchema.default("mbox"),
    actorMbox: fieldRefSchema.optional(),
    actorMboxSha1sum: fieldRefSchema.optional(),
    actorOpenid: fieldRefSchema.optional(),
    actorAccountHomePage: fieldRefSchema.optional(),
    actorAccountName: fieldRefSchema.optional(),
    verbId: fieldRefSchema,
    verbDisplay: fieldRefSchema.optional(),
    objectId: fieldRefSchema,
    objectDefinitionName: fieldRefSchema.optional(),
    objectDefinitionDescription: fieldRefSchema.optional(),
    objectDefinitionType: fieldRefSchema.optional(),
    objectDefinitionMoreInfo: fieldRefSchema.optional(),
    resultScoreScaled: fieldRefSchema.optional(),
    resultScoreRaw: fieldRefSchema.optional(),
    resultScoreMin: fieldRefSchema.optional(),
    resultScoreMax: fieldRefSchema.optional(),
    resultSuccess: fieldRefSchema.optional(),
    resultCompletion: fieldRefSchema.optional(),
    resultResponse: fieldRefSchema.optional(),
    resultDuration: fieldRefSchema.optional(),
    contextRegistration: fieldRefSchema.optional(),
    contextJson: fieldRefSchema.optional(),
    metadataJson: fieldRefSchema.optional(),
    stored: fieldRefSchema.optional(),
    authorityJson: fieldRefSchema.optional(),
    version: fieldRefSchema.optional(),
    attachmentsJson: fieldRefSchema.optional(),
  })
  .superRefine((mapping, ctx) => {
    switch (mapping.actorIfiType) {
      case "mbox":
        if (!mapping.actorMbox) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actorMbox"],
            message: "Actor IFI type mbox requires an mbox mapping (mailto IRI).",
          });
        }
        break;
      case "mbox_sha1sum":
        if (!mapping.actorMboxSha1sum) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actorMboxSha1sum"],
            message: "Actor IFI type mbox_sha1sum requires an mbox_sha1sum mapping (40 hex chars, SHA-1 of mailto IRI).",
          });
        }
        break;
      case "openid":
        if (!mapping.actorOpenid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actorOpenid"],
            message: "Actor IFI type openid requires an openid mapping (URI).",
          });
        }
        break;
      case "account":
        if (!mapping.actorAccountHomePage || !mapping.actorAccountName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actorAccountHomePage"],
            message: "Actor IFI type account requires both account homePage and account name mappings.",
          });
        }
        break;
      default:
        break;
    }
  });

export type FieldRef = z.infer<typeof fieldRefSchema>;

function getByPath(obj: Record<string, unknown>, path: string) {
  const keys = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== "object" || !(key in (cur as Record<string, unknown>))) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function readRefRaw(
  ref: FieldRef | undefined,
  vars: Record<string, unknown>,
  templateUris: Record<string, string> = {},
) {
  if (!ref) return undefined;
  if (ref.mode === "literal") return ref.value;
  if (ref.mode === "template") {
    const iri = templateUris[ref.value];
    return iri === undefined || iri === "" ? undefined : iri;
  }
  const out = getByPath(vars, ref.value);
  return out === undefined || out === null ? undefined : out;
}

function readRef(
  ref: FieldRef | undefined,
  vars: Record<string, unknown>,
  templateUris: Record<string, string> = {},
) {
  const raw = readRefRaw(ref, vars, templateUris);
  return raw === undefined || raw === null ? undefined : String(raw);
}

function parseBoolean(input: string | undefined) {
  if (input === undefined) return undefined;
  const v = input.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function parseNumber(input: string | undefined) {
  if (input === undefined) return undefined;
  const n = Number(input);
  return Number.isFinite(n) ? n : undefined;
}

function parseMaybeJson(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return undefined;
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function hasNullOutsideExtensions(value: unknown, path: string[] = []): string[] {
  const issues: string[] = [];
  if (value === null) {
    const inExtensions = path.includes("extensions");
    if (!inExtensions) issues.push(path.join(".") || "(root)");
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => issues.push(...hasNullOutsideExtensions(item, [...path, String(i)])));
    return issues;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      issues.push(...hasNullOutsideExtensions(v, [...path, k]));
    }
  }
  return issues;
}

function isIri(value: string | undefined) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return Boolean(u.protocol);
  } catch {
    return false;
  }
}

/** Bare email or mailto IRI → mailto IRI string for xAPI mbox. */
export function normalizeMboxToMailtoIri(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^mailto:/i.test(t)) return t;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(t)) return `mailto:${t}`;
  return t;
}

function isValidMailtoIri(mbox: string): boolean {
  try {
    const u = new URL(mbox);
    return u.protocol === "mailto:";
  } catch {
    return false;
  }
}

const MBOX_SHA1_HEX = /^[a-f0-9]{40}$/i;

export function validateMboxSha1SumValue(value: string | undefined): boolean {
  if (!value) return false;
  return MBOX_SHA1_HEX.test(value.trim());
}

export function validateStatementAgainstSpec(statement: Record<string, unknown>) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!statement.actor) errors.push("Statement MUST include actor.");
  if (!statement.verb) errors.push("Statement MUST include verb.");
  if (!statement.object) errors.push("Statement MUST include object.");

  const actor = statement.actor as Record<string, unknown> | undefined;
  if (actor) {
    const ifis = ["mbox", "mbox_sha1sum", "openid", "account"].filter((k) => actor[k] !== undefined);
    if (ifis.length !== 1) {
      errors.push("Actor MUST include exactly one inverse functional identifier (mbox, mbox_sha1sum, openid, account).");
    }
    const mbox = typeof actor.mbox === "string" ? actor.mbox : undefined;
    if (mbox !== undefined) {
      if (!isValidMailtoIri(mbox)) {
        errors.push("Actor mbox MUST be a mailto IRI (e.g. mailto:user@example.com).");
      }
    }
    const sha1 = typeof actor.mbox_sha1sum === "string" ? actor.mbox_sha1sum : undefined;
    if (sha1 !== undefined) {
      if (!validateMboxSha1SumValue(sha1)) {
        errors.push("Actor mbox_sha1sum MUST be a 40-character hex-encoded SHA-1 of the mailto IRI (not the raw email).");
      }
    }
    const openid = typeof actor.openid === "string" ? actor.openid : undefined;
    if (openid !== undefined) {
      if (!isIri(openid)) {
        errors.push("Actor openid MUST be a valid URI.");
      }
    }
    const account = actor.account;
    if (account !== undefined) {
      if (!account || typeof account !== "object" || Array.isArray(account)) {
        errors.push("Actor account MUST be an object with homePage and name.");
      } else {
        const acc = account as Record<string, unknown>;
        const hp = typeof acc.homePage === "string" ? acc.homePage : undefined;
        const name = typeof acc.name === "string" ? acc.name : undefined;
        if (!hp || !name?.trim()) {
          errors.push("Actor account MUST include non-empty homePage and name strings.");
        } else if (!isIri(hp)) {
          errors.push("Actor account homePage MUST be a valid URI.");
        }
      }
    }
  }

  const verb = statement.verb as Record<string, unknown> | undefined;
  const verbId = typeof verb?.id === "string" ? verb.id : undefined;
  if (verb && !isIri(verbId)) {
    errors.push("Verb id MUST be a valid IRI.");
  }

  const object = statement.object as Record<string, unknown> | undefined;
  const objectId = typeof object?.id === "string" ? object.id : undefined;
  if (object && !isIri(objectId)) {
    errors.push("Object id SHOULD be a valid IRI.");
  }

  const version = typeof statement.version === "string" ? statement.version : undefined;
  if (version && !version.startsWith("1.0.")) {
    errors.push('Statement version MUST start with "1.0." when set.');
  }

  const nullPaths = hasNullOutsideExtensions(statement);
  if (nullPaths.length > 0) {
    errors.push(`Statement contains null values outside extensions at: ${nullPaths.slice(0, 5).join(", ")}.`);
  }

  return { errors, warnings };
}

export function buildStatementPreview(
  mapping: z.infer<typeof statementPlanMappingSchema>,
  vars: Record<string, unknown>,
  templateUris: Record<string, string> = {},
) {
  const actorMbox = readRef(mapping.actorMbox, vars, templateUris);
  const actorMboxSha1sum = readRef(mapping.actorMboxSha1sum, vars, templateUris);
  const actorOpenid = readRef(mapping.actorOpenid, vars, templateUris);
  const actorAccountHomePage = readRef(mapping.actorAccountHomePage, vars, templateUris);
  const actorAccountName = readRef(mapping.actorAccountName, vars, templateUris);
  const verbId = readRef(mapping.verbId, vars, templateUris);
  const objectId = readRef(mapping.objectId, vars, templateUris);

  const actor: Record<string, unknown> = { objectType: "Agent" };
  switch (mapping.actorIfiType) {
    case "mbox": {
      if (actorMbox) {
        const normalized = normalizeMboxToMailtoIri(actorMbox);
        if (normalized) actor.mbox = normalized;
      }
      break;
    }
    case "mbox_sha1sum": {
      if (actorMboxSha1sum) actor.mbox_sha1sum = actorMboxSha1sum.trim().toLowerCase();
      break;
    }
    case "openid": {
      if (actorOpenid) actor.openid = actorOpenid.trim();
      break;
    }
    case "account": {
      if (actorAccountHomePage && actorAccountName) {
        actor.account = { homePage: actorAccountHomePage.trim(), name: actorAccountName.trim() };
      }
      break;
    }
    default:
      break;
  }

  const objectDefinition: Record<string, unknown> = {};
  const objectDefName = readRef(mapping.objectDefinitionName, vars, templateUris);
  const objectDefDescription = readRef(mapping.objectDefinitionDescription, vars, templateUris);
  const objectDefType = readRef(mapping.objectDefinitionType, vars, templateUris);
  const objectDefMoreInfo = readRef(mapping.objectDefinitionMoreInfo, vars, templateUris);
  if (objectDefName) objectDefinition.name = { "en-US": objectDefName };
  if (objectDefDescription) objectDefinition.description = { "en-US": objectDefDescription };
  if (objectDefType) objectDefinition.type = objectDefType;
  if (objectDefMoreInfo) objectDefinition.moreInfo = objectDefMoreInfo;
  const metadataJson = parseMaybeJson(readRefRaw(mapping.metadataJson, vars, templateUris));
  if (metadataJson && typeof metadataJson === "object") {
    Object.assign(objectDefinition, metadataJson as Record<string, unknown>);
  }

  const statement: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    actor: Object.keys(actor).length > 1 ? actor : undefined,
    verb: verbId
      ? {
          id: verbId,
          display: {
            "en-US": readRef(mapping.verbDisplay, vars, templateUris) ?? verbId.split("/").pop() ?? "did",
          },
        }
      : undefined,
    object: objectId
      ? {
          objectType: "Activity",
          id: objectId,
          definition: Object.keys(objectDefinition).length > 0 ? objectDefinition : undefined,
        }
      : undefined,
  };

  const timestampOverride = readRef(mapping.stored, vars, templateUris);
  if (timestampOverride) statement.stored = timestampOverride;

  const version = readRef(mapping.version, vars, templateUris);
  if (version) statement.version = version;

  const authorityJson = parseMaybeJson(readRefRaw(mapping.authorityJson, vars, templateUris));
  if (authorityJson && typeof authorityJson === "object") {
    statement.authority = authorityJson;
  }

  const attachmentsJson = parseMaybeJson(readRefRaw(mapping.attachmentsJson, vars, templateUris));
  if (Array.isArray(attachmentsJson)) {
    statement.attachments = attachmentsJson;
  }

  const context: Record<string, unknown> = {};
  const scoreRaw = readRef(mapping.resultScoreRaw, vars, templateUris);
  const scoreScaled = readRef(mapping.resultScoreScaled, vars, templateUris);
  const scoreMin = readRef(mapping.resultScoreMin, vars, templateUris);
  const scoreMax = readRef(mapping.resultScoreMax, vars, templateUris);
  const success = readRef(mapping.resultSuccess, vars, templateUris);
  const completion = readRef(mapping.resultCompletion, vars, templateUris);
  const response = readRef(mapping.resultResponse, vars, templateUris);
  const duration = readRef(mapping.resultDuration, vars, templateUris);
  if (scoreRaw || scoreScaled || scoreMin || scoreMax || success || completion || response || duration) {
    const score: Record<string, unknown> = {};
    const raw = parseNumber(scoreRaw);
    const scaled = parseNumber(scoreScaled);
    const min = parseNumber(scoreMin);
    const max = parseNumber(scoreMax);
    if (raw !== undefined) score.raw = raw;
    if (scaled !== undefined) score.scaled = scaled;
    if (min !== undefined) score.min = min;
    if (max !== undefined) score.max = max;
    statement.result = {
      score: Object.keys(score).length ? score : undefined,
      success: parseBoolean(success),
      completion: parseBoolean(completion),
      response: response ?? undefined,
      duration: duration ?? undefined,
    };
  }

  const registration = readRef(mapping.contextRegistration, vars, templateUris);
  if (registration) context.registration = registration;
  const contextJson = parseMaybeJson(readRefRaw(mapping.contextJson, vars, templateUris));
  if (contextJson && typeof contextJson === "object") {
    Object.assign(context, contextJson as Record<string, unknown>);
  }
  if (Object.keys(context).length > 0) {
    statement.context = context;
  }

  return statement;
}

