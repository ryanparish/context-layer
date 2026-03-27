import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { verifyStorylineValidationToken } from "@/server/auth/session";
import { buildUriFromTemplate, uriSegmentsSchema } from "@/server/uriLibrary";

type StorylineValidationEvent = {
  id: string;
  at: string;
  tenantId: string;
  source: string;
  templateId: string | null;
  iri: string | null;
  variableKeys: string[];
  ok: boolean;
  error: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __storylineValidationEvents: StorylineValidationEvent[] | undefined;
}

const validateSchema = z.object({
  templateId: z.string().optional(),
  baseUrl: z.string().url().optional(),
  segments: uriSegmentsSchema.optional(),
  variables: z.record(z.string(), z.unknown()).default({}),
  source: z.string().optional(),
});

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function getValidationEventsStore() {
  if (!globalThis.__storylineValidationEvents) {
    globalThis.__storylineValidationEvents = [];
  }
  return globalThis.__storylineValidationEvents;
}

function pushValidationEvent(event: StorylineValidationEvent) {
  const store = getValidationEventsStore();
  store.unshift(event);
  if (store.length > 100) {
    store.length = 100;
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  const store = getValidationEventsStore();
  const events = store.filter((e) => e.tenantId === session.tenantId).slice(0, 30);
  return withCors(NextResponse.json({ events }));
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token" }, { status: 401 }));
  }
  const authPayload = await verifyStorylineValidationToken(token).catch(() => null);
  if (!authPayload) {
    return withCors(NextResponse.json({ error: "Invalid validation token" }, { status: 401 }));
  }

  const body = await req.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(
      NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 }),
    );
  }

  const data = parsed.data;
  let baseUrl = data.baseUrl ?? "";
  let segments = data.segments ?? [];

  if (data.templateId) {
    const template = await prisma.uriTemplate.findFirst({
      where: { id: data.templateId, tenantId: authPayload.tenantId },
      select: { baseUrl: true, segments: true, name: true },
    });
    if (!template) {
      pushValidationEvent({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        tenantId: authPayload.tenantId,
        source: data.source ?? "storyline",
        templateId: data.templateId,
        iri: null,
        variableKeys: Object.keys(data.variables ?? {}),
        ok: false,
        error: "Template not found",
      });
      return withCors(NextResponse.json({ error: "Template not found" }, { status: 404 }));
    }
    baseUrl = template.baseUrl;
    segments = uriSegmentsSchema.parse(template.segments);
  }

  if (!baseUrl || segments.length === 0) {
    pushValidationEvent({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      tenantId: authPayload.tenantId,
      source: data.source ?? "storyline",
      templateId: data.templateId ?? null,
      iri: null,
      variableKeys: Object.keys(data.variables ?? {}),
      ok: false,
      error: "Provide templateId or baseUrl+segments",
    });
    return withCors(
      NextResponse.json({ error: "Provide templateId or baseUrl+segments" }, { status: 400 }),
    );
  }

  try {
    const iri = buildUriFromTemplate(baseUrl, segments, data.variables);
    const event: StorylineValidationEvent = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      tenantId: authPayload.tenantId,
      source: data.source ?? "storyline",
      templateId: data.templateId ?? null,
      iri,
      variableKeys: Object.keys(data.variables ?? {}),
      ok: true,
      error: null,
    };
    pushValidationEvent(event);
    console.info("[storyline-validate]", {
      source: event.source,
      templateId: event.templateId,
      iri: event.iri,
      variableKeys: event.variableKeys,
      at: event.at,
    });
    return withCors(NextResponse.json({ ok: true, iri, receivedAt: new Date().toISOString() }));
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Resolve failed";
    pushValidationEvent({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      tenantId: authPayload.tenantId,
      source: data.source ?? "storyline",
      templateId: data.templateId ?? null,
      iri: null,
      variableKeys: Object.keys(data.variables ?? {}),
      ok: false,
      error: errorMessage,
    });
    return withCors(
      NextResponse.json({ ok: false, error: errorMessage }, { status: 400 }),
    );
  }
}

