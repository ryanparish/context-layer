"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/ui/Reveal";

type Segment = { type: "static" | "variable"; value: string; sourceKey?: string };
type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  sourceType: "ANY" | "API" | "COURSE";
  baseUrl: string;
  segments: Segment[];
  active: boolean;
  updatedAt: string;
};

type RefMode = "literal" | "var" | "template";
type RefField = { mode: RefMode; value: string };
type VerbOption = {
  iri: string;
  display: string;
  description: string;
  source?: "default" | "custom";
};
type Plan = {
  id: string;
  name: string;
  description: string | null;
  uriTemplateId: string | null;
  mapping: Record<string, RefField>;
};
type StorylineValidationEvent = {
  id: string;
  at: string;
  source: string;
  templateId: string | null;
  iri: string | null;
  variableKeys: string[];
  ok: boolean;
  error: string | null;
};
type StorylineVariableType = "text" | "number" | "boolean";
type ActorIfiType = "mbox" | "mbox_sha1sum" | "openid" | "account";
type SpecValidation = { errors: string[]; warnings: string[] };

const registryFallbackVerbs: VerbOption[] = [
  {
    iri: "http://adlnet.gov/expapi/verbs/experienced",
    display: "experienced",
    description: "Indicates that the actor experienced the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/completed",
    display: "completed",
    description: "Indicates that the actor completed the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/attempted",
    display: "attempted",
    description: "Indicates that the actor attempted the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/passed",
    display: "passed",
    description: "Indicates that the actor passed the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/failed",
    display: "failed",
    description: "Indicates that the actor failed the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/answered",
    display: "answered",
    description: "Indicates that the actor answered a question object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/interacted",
    display: "interacted",
    description: "Indicates that the actor interacted with the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/progressed",
    display: "progressed",
    description: "Indicates that the actor progressed in the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/initialized",
    display: "initialized",
    description: "Indicates that the actor initialized the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/terminated",
    display: "terminated",
    description: "Indicates that the actor terminated engagement with the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/launched",
    display: "launched",
    description: "Indicates that the actor launched the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/suspended",
    display: "suspended",
    description: "Indicates that the actor suspended interaction with the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/resumed",
    display: "resumed",
    description: "Indicates that the actor resumed interaction with the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/scored",
    display: "scored",
    description: "Indicates that the actor scored the object.",
    source: "default",
  },
  {
    iri: "http://adlnet.gov/expapi/verbs/voided",
    display: "voided",
    description: "Indicates that the actor voided a statement.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/acknowledge",
    display: "acknowledged",
    description:
      "Indicates that the actor has acknowledged the object. This effectively signals that the actor is aware of the object's existence.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/like",
    display: "liked",
    description: "Indicates that the actor likes the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/dislike",
    display: "disliked",
    description: "Indicates that the actor dislikes the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/favorite",
    display: "favorited",
    description: "Indicates that the actor marked the object as a favorite.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/share",
    display: "shared",
    description: "Indicates that the actor shared the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/comment",
    display: "commented",
    description: "Indicates that the actor commented on the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/submit",
    display: "submitted",
    description: "Indicates that the actor submitted the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/approve",
    display: "approved",
    description: "Indicates that the actor approved the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/reject",
    display: "rejected",
    description: "Indicates that the actor rejected the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/complete",
    display: "completed (AS)",
    description: "Indicates that the actor completed the object (Activity Streams verb).",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/create",
    display: "created",
    description: "Indicates that the actor created the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/update",
    display: "updated",
    description: "Indicates that the actor updated the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/delete",
    display: "deleted",
    description: "Indicates that the actor deleted the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/archive",
    display: "archived",
    description: "Indicates that the actor archived the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/unarchive",
    display: "unarchived",
    description: "Indicates that the actor unarchived the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/assign",
    display: "assigned",
    description: "Indicates that the actor assigned the object to someone.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/unassign",
    display: "unassigned",
    description: "Indicates that the actor unassigned the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/start",
    display: "started",
    description: "Indicates that the actor started the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/finish",
    display: "finished",
    description: "Indicates that the actor finished the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/open",
    display: "opened",
    description: "Indicates that the actor opened the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/close",
    display: "closed",
    description: "Indicates that the actor closed the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/resolve",
    display: "resolved",
    description: "Indicates that the actor resolved the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/flag-as-inappropriate",
    display: "flagged",
    description: "Indicates that the actor flagged the object as inappropriate.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/read",
    display: "read",
    description: "Indicates that the actor read the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/view",
    display: "viewed",
    description: "Indicates that the actor viewed the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/watch",
    display: "watched",
    description: "Indicates that the actor watched the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/listen",
    display: "listened",
    description: "Indicates that the actor listened to the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/download",
    display: "downloaded",
    description: "Indicates that the actor downloaded the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/upload",
    display: "uploaded",
    description: "Indicates that the actor uploaded the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/join",
    display: "joined",
    description: "Indicates that the actor joined the object (e.g., group, course, channel).",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/leave",
    display: "left",
    description: "Indicates that the actor left the object (e.g., group, course, channel).",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/follow",
    display: "followed",
    description: "Indicates that the actor followed the object.",
    source: "default",
  },
  {
    iri: "http://activitystrea.ms/schema/1.0/unfollow",
    display: "unfollowed",
    description: "Indicates that the actor unfollowed the object.",
    source: "default",
  },
];

function mergeTemplateSamplesIntoVariables(
  base: Record<string, unknown>,
  samples: Record<string, string>,
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [path, val] of Object.entries(samples)) {
    const p = path.trim();
    if (!p) continue;
    setNestedVariableValue(clone, p, val);
  }
  return clone;
}

function setNestedVariableValue(obj: Record<string, unknown>, path: string, value: string) {
  const keys = path.split(".").filter(Boolean);
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function collectTemplateIdsFromMapping(planMapping: Record<string, RefField>): string[] {
  const ids = new Set<string>();
  for (const v of Object.values(planMapping)) {
    if (v?.mode === "template" && v.value.trim()) ids.add(v.value.trim());
  }
  return [...ids];
}

function collectVariableKeysForTemplates(templates: Template[], templateIds: string[]): string[] {
  const keys = new Set<string>();
  for (const id of templateIds) {
    const t = templates.find((x) => x.id === id);
    if (!t) continue;
    for (const seg of t.segments) {
      if (seg.type === "variable") {
        const sk = (seg.sourceKey || seg.value).trim();
        if (sk) keys.add(sk);
      }
    }
  }
  return [...keys].sort();
}

function parseMergedPlannerVariables(
  variablesText: string,
  templateSampleVars: Record<string, string>,
): Record<string, unknown> {
  const base = JSON.parse(variablesText || "{}") as Record<string, unknown>;
  return mergeTemplateSamplesIntoVariables(base, templateSampleVars);
}

function SearchableTemplateSelect({
  templates,
  value,
  onChange,
}: {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return templates.filter((t) => {
      const hay = `${t.name} ${t.description ?? ""} ${t.id}`.toLowerCase();
      return !ql || hay.includes(ql);
    });
  }, [templates, q]);
  const selected = templates.find((t) => t.id === value);

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        className="field !mt-0 flex min-h-[48px] min-w-0 flex-1 !w-auto items-center justify-between gap-2 px-3 py-3 text-left text-sm sm:text-base"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="truncate">{selected ? selected.name : "Select template…"}</span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="absolute z-50 mt-1 w-full min-w-[240px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            className="field !mt-0 mb-2 text-xs"
            placeholder="Search templates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="max-h-52 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-1 text-xs text-slate-500">No matches</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100"
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="font-medium">{t.name}</span>
                  {t.description ? (
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{t.description}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function UriLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [lastSavedTemplateId, setLastSavedTemplateId] = useState<string | null>(null);

  const [name, setName] = useState("Course activity URI");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("learning");
  const [sourceType, setSourceType] = useState<"ANY" | "API" | "COURSE">("ANY");
  const [baseUrl, setBaseUrl] = useState("https://example.com");
  const [segments, setSegments] = useState<Segment[]>([
    { type: "static", value: "course" },
    { type: "variable", value: "courseId", sourceKey: "course.id" },
    { type: "static", value: "module" },
    { type: "variable", value: "moduleId", sourceKey: "module.id" },
  ]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [variablesText, setVariablesText] = useState('{"course":{"id":"101"},"module":{"id":"2"}}');
  const [resolvedUri, setResolvedUri] = useState("");
  const [resolvingUri, setResolvingUri] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [storylineAppBaseUrl, setStorylineAppBaseUrl] = useState("http://localhost:3000");
  const [storylineStatusVar, setStorylineStatusVar] = useState("cl_uri_status");
  const [storylineResolvedUriVar, setStorylineResolvedUriVar] = useState("cl_resolved_uri");
  const [storylineErrorVar, setStorylineErrorVar] = useState("cl_uri_error");
  const [storylineCopied, setStorylineCopied] = useState(false);
  const [storylineAuthToken, setStorylineAuthToken] = useState("");
  const [storylineTokenError, setStorylineTokenError] = useState<string | null>(null);
  const [storylineTokenExpiresAt, setStorylineTokenExpiresAt] = useState<string | null>(null);
  const [storylineVarTypeOverrides, setStorylineVarTypeOverrides] = useState<Record<string, StorylineVariableType>>({});
  const [storylineSanityStatus, setStorylineSanityStatus] = useState<string | null>(null);
  const [storylineSanityError, setStorylineSanityError] = useState<string | null>(null);
  const [storylineSanityRunning, setStorylineSanityRunning] = useState(false);
  const [storylineEvents, setStorylineEvents] = useState<StorylineValidationEvent[]>([]);
  const [storylineEventsError, setStorylineEventsError] = useState<string | null>(null);
  const [resolveLabel, setResolveLabel] = useState("Resolved URI");
  const [resolveCategory, setResolveCategory] = useState("RESOLVED");
  const [catalogResolved, setCatalogResolved] = useState(true);

  const [planName, setPlanName] = useState("Default xAPI plan");
  const [planDescription, setPlanDescription] = useState("");
  const [planTemplateId, setPlanTemplateId] = useState("");
  const [planPreview, setPlanPreview] = useState("");
  const [verbs, setVerbs] = useState<VerbOption[]>([]);
  const [verbSourceMode, setVerbSourceMode] = useState<"registry" | "custom">("registry");
  const [selectedRegistryIri, setSelectedRegistryIri] = useState("");
  const [customVerbIri, setCustomVerbIri] = useState("https://example.com/xapi/verbs/custom");
  const [customVerbDisplay, setCustomVerbDisplay] = useState("custom");
  const [customVerbDescription, setCustomVerbDescription] = useState("Describe what this verb means.");
  const [selectedCustomVerbIri, setSelectedCustomVerbIri] = useState("");
  const [actorIfiType, setActorIfiType] = useState<ActorIfiType>("mbox");
  const [planMapping, setPlanMapping] = useState<Record<string, RefField>>({
    actorMbox: { mode: "literal", value: "mailto:learner@example.com" },
    verbId: { mode: "literal", value: "http://adlnet.gov/expapi/verbs/experienced" },
    objectId: { mode: "literal", value: "https://example.com/xapi/activities/example" },
  });

  function buildPlanMappingPayload(): Record<string, unknown> {
    return { actorIfiType, ...planMapping };
  }
  const [specModeEnabled, setSpecModeEnabled] = useState(true);
  const [specValidation, setSpecValidation] = useState<SpecValidation>({ errors: [], warnings: [] });
  const [lrsConnections, setLrsConnections] = useState<{ id: string; name: string }[]>([]);
  const [lrsTestConnectionId, setLrsTestConnectionId] = useState("");
  const [lrsTestLoading, setLrsTestLoading] = useState(false);
  const [lrsTestResult, setLrsTestResult] = useState<unknown>(null);
  const [lrsTestError, setLrsTestError] = useState<string | null>(null);
  const [lrsVoidLoading, setLrsVoidLoading] = useState(false);
  const [lrsVoidError, setLrsVoidError] = useState<string | null>(null);
  const [lrsVoidResult, setLrsVoidResult] = useState<unknown>(null);
  /** Dotted paths → sample values for URI template variable segments (merged into Variables JSON for preview/LRS). */
  const [templateSampleVars, setTemplateSampleVars] = useState<Record<string, string>>({});
  const [plannerExtras, setPlannerExtras] = useState<Record<string, boolean>>({
    objectDefinition: false,
    context: false,
    metadata: false,
    result: false,
    stored: false,
    authority: false,
    version: false,
    attachments: false,
  });

  type UriLabSection = "templates" | "storyline" | "resolve" | "planner";
  const URI_LAB_SECTION_KEY = "xapivate_uri_library_section";
  const [uriLabSection, setUriLabSection] = useState<UriLabSection>("templates");

  useEffect(() => {
    try {
      const s = localStorage.getItem(URI_LAB_SECTION_KEY);
      if (s === "templates" || s === "storyline" || s === "resolve" || s === "planner") {
        setUriLabSection(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(URI_LAB_SECTION_KEY, uriLabSection);
    } catch {
      /* ignore */
    }
  }, [uriLabSection]);

  useEffect(() => {
    if (lrsConnections.length === 1) setLrsTestConnectionId(lrsConnections[0].id);
  }, [lrsConnections]);

  const plannerTemplateVarKeys = useMemo(() => {
    const ids = collectTemplateIdsFromMapping(planMapping);
    return collectVariableKeysForTemplates(templates, ids);
  }, [planMapping, templates]);

  useEffect(() => {
    const ids = collectTemplateIdsFromMapping(planMapping);
    const keys = new Set(collectVariableKeysForTemplates(templates, ids));
    setTemplateSampleVars((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!keys.has(k)) delete next[k];
      }
      return next;
    });
  }, [planMapping, templates]);

  const needsStripInvalidTemplateModes = useMemo(
    () =>
      Object.entries(planMapping).some(([k, v]) => k !== "objectId" && v?.mode === "template"),
    [planMapping],
  );

  useEffect(() => {
    if (!needsStripInvalidTemplateModes) return;
    setPlanMapping((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(next)) {
        if (k === "objectId" || !v) continue;
        if (v.mode === "template") {
          next[k] = { mode: "var", value: v.value };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [needsStripInvalidTemplateModes]);

  const effectiveVerbs = useMemo(
    () => (verbs.length ? verbs : registryFallbackVerbs),
    [verbs],
  );
  const registryVerbs = useMemo(
    () => effectiveVerbs.filter((v) => v.source !== "custom"),
    [effectiveVerbs],
  );
  const customVerbs = useMemo(
    () => effectiveVerbs.filter((v) => v.source === "custom"),
    [effectiveVerbs],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes, vRes, cRes] = await Promise.allSettled([
        fetch("/api/uri-library/templates", { cache: "no-store" }),
        fetch("/api/uri-library/statement-plans", { cache: "no-store" }),
        fetch("/api/xapi/verbs", { cache: "no-store" }),
        fetch("/api/connections", { cache: "no-store" }),
      ]);

      const templatesOk =
        tRes.status === "fulfilled" && tRes.value.ok ? ((await tRes.value.json()) as { templates: Template[] }) : null;
      const plansOk =
        pRes.status === "fulfilled" && pRes.value.ok ? ((await pRes.value.json()) as { plans: Plan[] }) : null;
      const verbsOk =
        vRes.status === "fulfilled" && vRes.value.ok ? ((await vRes.value.json()) as { verbs: VerbOption[] }) : null;
      const connectionsOk =
        cRes.status === "fulfilled" && cRes.value.ok
          ? ((await cRes.value.json()) as { connections: { id: string; name: string; type: string }[] })
          : null;

      if (templatesOk) setTemplates(templatesOk.templates ?? []);
      if (plansOk) setPlans(plansOk.plans ?? []);
      if (verbsOk) setVerbs(verbsOk.verbs ?? []);
      if (connectionsOk?.connections?.length) {
        setLrsConnections(
          connectionsOk.connections.filter((c) => c.type === "lrs_xapi_basic").map((c) => ({ id: c.id, name: c.name })),
        );
      } else {
        setLrsConnections([]);
      }

      if (!templatesOk) {
        // Keep the page usable (especially the verb dropdown) even if templates endpoint fails (e.g. session expired).
        setTemplates([]);
      }
      if (!plansOk) setPlans([]);

      const sourceVerbs = verbsOk?.verbs?.length ? verbsOk.verbs : registryFallbackVerbs;
      const initial = sourceVerbs[0];
      if (!selectedRegistryIri && initial) {
        const first = initial;
        if (first?.iri) setSelectedRegistryIri(first.iri);
        if (first?.iri) setCustomVerbIri(first.iri);
        if (first?.display) setCustomVerbDisplay(first.display);
        if (first?.description) setCustomVerbDescription(first.description);
        if (first?.iri) {
          setPlanMapping((prev) => ({
            ...prev,
            verbId: { mode: "literal", value: first.iri },
            verbDisplay: { mode: "literal", value: first.display ?? "" },
          }));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const canAddSegment = segments.length < 50;

  const previewUri = useMemo(() => {
    const base = baseUrl.trim().replace(/\/+$/, "");
    if (!base) return "";
    const parts = segments
      .map((s) => (s.type === "static" ? s.value.trim() : `{${(s.sourceKey || s.value).trim()}}`))
      .filter(Boolean);
    return `${base}/${parts.join("/")}`;
  }, [baseUrl, segments]);

  function sanitizeStorylineVarName(input: string, fallback: string) {
    const toCamel = (raw: string) => {
      const parts = (raw || "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
        .filter(Boolean);
      if (parts.length === 0) return "";
      const [first, ...rest] = parts;
      return `${first}${rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}`;
    };

    const candidate = toCamel(input) || toCamel(fallback) || "var1";
    return /^[a-zA-Z]/.test(candidate) ? candidate : `v${candidate}`;
  }

  const storylineMappings = useMemo(
    () => {
      const used = new Set<string>();
      return segments
        .filter((seg) => seg.type === "variable")
        .map((seg, idx) => {
          const baseName = sanitizeStorylineVarName(
            (seg.value || `var${idx + 1}`).trim() || `var${idx + 1}`,
            `var${idx + 1}`,
          );
          let storylineVar = baseName;
          let suffix = 2;
          while (used.has(storylineVar)) {
            storylineVar = `${baseName}${suffix}`;
            suffix += 1;
          }
          used.add(storylineVar);
          return {
            storylineVar,
            path: (seg.sourceKey || seg.value).trim(),
          };
        })
        .filter((m) => m.path.length > 0);
    },
    [segments],
  );

  const storylineManifestRows = useMemo(() => {
    const inputRows = storylineMappings.map((m) => ({
      name: m.storylineVar,
      direction: "IN" as const,
      type: storylineVarTypeOverrides[m.storylineVar] ?? ("text" as StorylineVariableType),
      path: m.path,
      defaultValue: "",
      notes: "Used in player.GetVar and sent to URI validation payload",
    }));
    const outputDefs = [
      {
        name: sanitizeStorylineVarName(storylineStatusVar, "clUriStatus"),
        defaultValue: "sending|ok|error",
        notes: "Set via player.SetVar status updates",
      },
      {
        name: sanitizeStorylineVarName(storylineResolvedUriVar, "clResolvedUri"),
        defaultValue: "",
        notes: "Set via player.SetVar with resolved URI",
      },
      {
        name: sanitizeStorylineVarName(storylineErrorVar, "clUriError"),
        defaultValue: "",
        notes: "Set via player.SetVar with error message",
      },
    ];
    const outputRows = outputDefs.map((d) => ({
      name: d.name,
      direction: "OUT" as const,
      type: storylineVarTypeOverrides[d.name] ?? ("text" as StorylineVariableType),
      path: "",
      defaultValue: d.defaultValue,
      notes: d.notes,
    }));
    return [...inputRows, ...outputRows];
  }, [
    storylineMappings,
    storylineVarTypeOverrides,
    storylineStatusVar,
    storylineResolvedUriVar,
    storylineErrorVar,
  ]);

  const storylineScript = useMemo(() => {
    const mappingsJson = JSON.stringify(storylineMappings, null, 2);
    const safeBase = JSON.stringify(storylineAppBaseUrl.trim().replace(/\/+$/, ""));
    const safeStatusVar = JSON.stringify(
      sanitizeStorylineVarName(storylineStatusVar.trim() || "cl_uri_status", "clUriStatus"),
    );
    const safeResolvedVar = JSON.stringify(
      sanitizeStorylineVarName(storylineResolvedUriVar.trim() || "cl_resolved_uri", "clResolvedUri"),
    );
    const safeErrorVar = JSON.stringify(
      sanitizeStorylineVarName(storylineErrorVar.trim() || "cl_uri_error", "clUriError"),
    );
    const safeAuthToken = JSON.stringify(storylineAuthToken.trim());
    const safeBaseUrl = JSON.stringify(baseUrl.trim());
    const safeSegments = JSON.stringify(segments);
    const safeTemplateId = JSON.stringify(selectedTemplateId || "");
    return `(function () {
  var player = GetPlayer();
  var APP_BASE_URL = ${safeBase};
  var STATUS_VAR = ${safeStatusVar};
  var RESOLVED_URI_VAR = ${safeResolvedVar};
  var ERROR_VAR = ${safeErrorVar};
  var AUTH_TOKEN = ${safeAuthToken};
  var TEMPLATE_ID = ${safeTemplateId};
  var BASE_URL = ${safeBaseUrl};
  var SEGMENTS = ${safeSegments};
  var MAPPINGS = ${mappingsJson};

  function setPath(obj, path, value) {
    var keys = String(path || "").split(".").filter(Boolean);
    if (!keys.length) return;
    var cur = obj;
    for (var i = 0; i < keys.length - 1; i += 1) {
      if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  var variables = {};
  MAPPINGS.forEach(function (m) {
    var val = player.GetVar(m.storylineVar);
    setPath(variables, m.path, val);
  });

  player.SetVar(STATUS_VAR, "sending");
  player.SetVar(ERROR_VAR, "");

  var payload = {
    templateId: TEMPLATE_ID || undefined,
    baseUrl: TEMPLATE_ID ? undefined : BASE_URL,
    segments: TEMPLATE_ID ? undefined : SEGMENTS,
    variables: variables,
    source: "storyline"
  };

  fetch(APP_BASE_URL + "/api/uri-library/storyline/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + AUTH_TOKEN
    },
    body: JSON.stringify(payload)
  })
    .then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { ok: res.ok, body: body };
      });
    })
    .then(function (result) {
      if (!result.ok) {
        player.SetVar(STATUS_VAR, "error");
        player.SetVar(ERROR_VAR, result.body && result.body.error ? String(result.body.error) : "Validation failed");
        return;
      }
      player.SetVar(STATUS_VAR, "ok");
      player.SetVar(RESOLVED_URI_VAR, result.body && result.body.iri ? String(result.body.iri) : "");
    })
    .catch(function (err) {
      player.SetVar(STATUS_VAR, "error");
      player.SetVar(ERROR_VAR, err && err.message ? String(err.message) : "Network error");
    });
})();`;
  }, [
    storylineMappings,
    storylineAppBaseUrl,
    storylineStatusVar,
    storylineResolvedUriVar,
    storylineErrorVar,
    storylineAuthToken,
    baseUrl,
    segments,
    selectedTemplateId,
    sanitizeStorylineVarName,
  ]);

  function setAtPath(target: Record<string, unknown>, path: string, value: unknown) {
    const keys = path.split(".").filter(Boolean);
    if (keys.length === 0) return;
    let cur: Record<string, unknown> = target;
    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      const next = cur[key];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        cur[key] = {};
      }
      cur = cur[key] as Record<string, unknown>;
    }
    cur[keys[keys.length - 1]] = value;
  }

  function buildVariablesSeedFromSegments(segList: Segment[]) {
    const seed: Record<string, unknown> = {};
    for (const seg of segList) {
      if (seg.type !== "variable") continue;
      const sourceKey = (seg.sourceKey || seg.value).trim();
      if (!sourceKey) continue;
      setAtPath(seed, sourceKey, `example_${seg.value || "value"}`);
    }
    return seed;
  }

  useEffect(() => {
    if (!selectedTemplateId) return;
    const selected = templates.find((t) => t.id === selectedTemplateId);
    if (!selected) return;
    const seed = buildVariablesSeedFromSegments(selected.segments);
    if (Object.keys(seed).length === 0) return;
    setVariablesText(JSON.stringify(seed, null, 2));
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStorylineAppBaseUrl(window.location.origin);
    }
  }, []);

  async function refreshStorylineToken() {
    try {
      const res = await fetch("/api/uri-library/storyline/token", { method: "POST" });
      const body = (await res.json().catch(() => null)) as { token?: string; error?: string } | null;
      if (!res.ok || !body?.token) throw new Error(body?.error ?? "Failed to generate token");
      setStorylineAuthToken(body.token);
      setStorylineTokenError(null);
    } catch (e) {
      setStorylineTokenError(e instanceof Error ? e.message : "Failed to generate token");
    }
  }

  useEffect(() => {
    void refreshStorylineToken();
  }, []);

  useEffect(() => {
    if (!storylineAuthToken) {
      setStorylineTokenExpiresAt(null);
      return;
    }
    try {
      const payloadPart = storylineAuthToken.split(".")[1];
      if (!payloadPart) throw new Error("Malformed token");
      const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (base64.length % 4)) % 4);
      const json = JSON.parse(atob(base64 + pad)) as { exp?: number };
      if (!json.exp) {
        setStorylineTokenExpiresAt(null);
        return;
      }
      setStorylineTokenExpiresAt(new Date(json.exp * 1000).toISOString());
    } catch {
      setStorylineTokenExpiresAt(null);
    }
  }, [storylineAuthToken]);

  async function runStorylineSanityCheck() {
    setStorylineSanityStatus(null);
    setStorylineSanityError(null);
    setStorylineSanityRunning(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const variables = buildVariablesSeedFromSegments(segments);
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch("/api/uri-library/storyline/validate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${storylineAuthToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
          baseUrl: selectedTemplateId ? undefined : baseUrl.trim(),
          segments: selectedTemplateId ? undefined : segments,
          variables,
          source: "uri-library-sanity-check",
        }),
      });
      if (timeout) clearTimeout(timeout);
      const body = (await res.json().catch(() => null)) as { ok?: boolean; iri?: string; error?: string } | null;
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? `Sanity check failed (${res.status})`);
      setStorylineSanityStatus(`Sanity check passed. Resolved IRI: ${body.iri ?? "(none)"}`);
      // pull freshest event list after successful check
      const eventsRes = await fetch("/api/uri-library/storyline/validate", { cache: "no-store" });
      const eventsBody = (await eventsRes.json().catch(() => null)) as { events?: StorylineValidationEvent[] } | null;
      if (eventsRes.ok && eventsBody?.events) setStorylineEvents(eventsBody.events);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setStorylineSanityError("Sanity check timed out. Please try again.");
      } else {
        setStorylineSanityError(e instanceof Error ? e.message : "Sanity check failed");
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      setStorylineSanityRunning(false);
    }
  }

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const res = await fetch("/api/uri-library/storyline/validate", { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as { events?: StorylineValidationEvent[]; error?: string } | null;
        if (!alive) return;
        if (!res.ok) throw new Error(body?.error ?? `Failed to load events (${res.status})`);
        setStorylineEvents(body?.events ?? []);
        setStorylineEventsError(null);
      } catch (e) {
        if (!alive) return;
        setStorylineEventsError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        if (!alive) return;
        timer = setTimeout(load, 10000);
      }
    };
    void load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function copyStorylineScript() {
    try {
      await navigator.clipboard.writeText(storylineScript);
      setStorylineCopied(true);
      setTimeout(() => setStorylineCopied(false), 1500);
    } catch {
      setStorylineCopied(false);
      setError("Unable to copy script. Please copy manually.");
    }
  }

  function downloadStorylineManifestJson() {
    const payload = {
      app: "xAPIvate",
      generatedAt: new Date().toISOString(),
      variables: storylineManifestRows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "storyline-variable-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(input: string) {
    const v = String(input ?? "");
    if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
      return `"${v.replace(/"/g, "\"\"")}"`;
    }
    return v;
  }

  function downloadStorylineManifestCsv() {
    const header = ["name", "direction", "type", "path", "defaultValue", "notes"];
    const lines = [
      header.join(","),
      ...storylineManifestRows.map((r) =>
        [
          csvEscape(r.name),
          csvEscape(r.direction),
          csvEscape(r.type),
          csvEscape(r.path),
          csvEscape(r.defaultValue),
          csvEscape(r.notes),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "storyline-variable-manifest.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateSegment(index: number, patch: Partial<Segment>) {
    setTemplateSaved(false);
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSegment(type: Segment["type"]) {
    if (!canAddSegment) return;
    setTemplateSaved(false);
    setSegments((prev) => [...prev, { type, value: type === "static" ? "segment" : "var", sourceKey: "" }]);
  }

  function moveSegment(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= segments.length || to >= segments.length) return;
    setTemplateSaved(false);
    setSegments((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSavingTemplate(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(
        editingTemplateId ? `/api/uri-library/templates/${editingTemplateId}` : "/api/uri-library/templates",
        {
        method: editingTemplateId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          sourceType,
          baseUrl: baseUrl.trim(),
          segments,
        }),
      });
      if (timeout) clearTimeout(timeout);
      const body = (await res.json().catch(() => null)) as { error?: string; template?: { id: string; name: string } } | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to save template");
      const savedId = body?.template?.id ?? null;
      if (savedId) {
        setLastSavedTemplateId(savedId);
        setSelectedTemplateId(savedId);
      }
      setInfo(
        editingTemplateId
          ? `Template updated${body?.template?.name ? `: ${body.template.name}` : ""}.`
          : `Template saved${body?.template?.name ? `: ${body.template.name}` : ""}.`,
      );
      setTemplateSaved(true);
      setEditingTemplateId(null);
      // Don't block the UI on refresh; a DB hiccup would otherwise leave the button stuck on "Saving…".
      void refresh();
      if (savedId) {
        // Make it obvious where the saved template lives.
        setTimeout(() => document.getElementById(`uri-template-${savedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      } else {
        setTimeout(() => document.getElementById("uri-templates-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    } catch (e2) {
      if (e2 instanceof DOMException && e2.name === "AbortError") {
        setError("Template save timed out. Please try again.");
      } else {
        setError(e2 instanceof Error ? e2.message : "Failed to save template");
      }
      setTimeout(() => document.getElementById("uri-template-save-feedback")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    finally {
      if (timeout) clearTimeout(timeout);
      setSavingTemplate(false);
    }
  }

  async function removeTemplate(id: string) {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/uri-library/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      if (selectedTemplateId === id) setSelectedTemplateId("");
      setInfo("Template deleted.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete template");
    }
  }

  async function resolveUri() {
    setError(null);
    setResolveError(null);
    setResolvedUri("");
    setResolvingUri(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const variables = parseMergedPlannerVariables(variablesText, templateSampleVars);
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch("/api/uri-library/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
          baseUrl: selectedTemplateId ? undefined : baseUrl.trim(),
          segments: selectedTemplateId ? undefined : segments,
          variables,
          label: resolveLabel.trim() || undefined,
          category: resolveCategory.trim() || undefined,
          catalogResolved,
        }),
      });
      if (timeout) clearTimeout(timeout);
      const body = (await res.json().catch(() => null)) as { iri?: string; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Resolve failed");
      setResolvedUri(body?.iri ?? "");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setResolveError("Resolve URI timed out. Please try again.");
      } else {
        setResolveError(e instanceof Error ? e.message : "Resolve failed");
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      setResolvingUri(false);
    }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      let mappingPayload: Record<string, unknown> = buildPlanMappingPayload();
      if (verbSourceMode === "custom") {
        if (!customVerbIri.trim() || !customVerbDescription.trim()) {
          throw new Error("Custom verb requires both URI and description");
        }
        mappingPayload = {
          ...mappingPayload,
          verbId: { mode: "literal", value: customVerbIri.trim() },
          verbDisplay: { mode: "literal", value: customVerbDisplay.trim() || "custom" },
        };
        setPlanMapping((prev) => ({
          ...prev,
          verbId: { mode: "literal", value: customVerbIri.trim() },
          verbDisplay: { mode: "literal", value: customVerbDisplay.trim() || "custom" },
        }));
      }

      const res = await fetch("/api/uri-library/statement-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: planName.trim(),
          description: planDescription.trim() || undefined,
          uriTemplateId: planTemplateId || undefined,
          mapping: mappingPayload,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to save statement plan");
      setInfo("Statement plan saved.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save statement plan");
    }
  }

  async function saveCustomVerb() {
    setError(null);
    setInfo(null);
    try {
      const iri = customVerbIri.trim();
      const display = customVerbDisplay.trim();
      const description = customVerbDescription.trim();
      if (!iri || !display || !description) {
        throw new Error("Custom verb IRI, display, and description are required");
      }
      const res = await fetch("/api/xapi/verbs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iri, display, description }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to save custom verb");
      setInfo("Custom verb saved to registry.");
      const refreshRes = await fetch("/api/xapi/verbs", { cache: "no-store" });
      const refreshData = (await refreshRes.json().catch(() => ({ verbs: [] }))) as { verbs: VerbOption[] };
      setVerbs(refreshData.verbs ?? []);
      setPlanMapping((prev) => ({
        ...prev,
        verbId: { mode: "literal", value: iri },
        verbDisplay: { mode: "literal", value: display },
      }));
      setVerbSourceMode("custom");
      setSelectedCustomVerbIri(iri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save custom verb");
    }
  }

  async function previewPlan() {
    setError(null);
    setPlanPreview("");
    setSpecValidation({ errors: [], warnings: [] });
    try {
      const variables = parseMergedPlannerVariables(variablesText, templateSampleVars);
      const res = await fetch("/api/uri-library/statement-plans/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapping: buildPlanMappingPayload(), variables }),
      });
      const body = (await res.json().catch(() => null)) as
        | { statement?: unknown; error?: string; specValidation?: SpecValidation }
        | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to preview statement");
      setPlanPreview(JSON.stringify(body?.statement ?? {}, null, 2));
      if (specModeEnabled) {
        setSpecValidation(body?.specValidation ?? { errors: [], warnings: [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview statement");
    }
  }

  const lrsTestVoidable = useMemo(() => {
    if (!lrsTestResult || typeof lrsTestResult !== "object") return null;
    const o = lrsTestResult as Record<string, unknown>;
    if (o.ok !== true) return null;
    const posted = o.statementPosted;
    if (!posted || typeof posted !== "object") return null;
    const p = posted as Record<string, unknown>;
    const id =
      typeof o.statementId === "string" && o.statementId.trim()
        ? o.statementId
        : typeof p.id === "string"
          ? p.id
          : null;
    const actor = p.actor;
    if (!id?.trim() || !actor || typeof actor !== "object" || Array.isArray(actor)) return null;
    return { statementId: id, actor };
  }, [lrsTestResult]);

  async function sendStatementToLrs() {
    setLrsTestError(null);
    setLrsTestResult(null);
    setLrsVoidError(null);
    setLrsVoidResult(null);
    if (!lrsTestConnectionId.trim()) {
      setLrsTestError("Select an LRS connection.");
      return;
    }
    setLrsTestLoading(true);
    try {
      let mappingPayload: Record<string, unknown> = buildPlanMappingPayload();
      if (verbSourceMode === "custom") {
        if (!customVerbIri.trim() || !customVerbDescription.trim()) {
          throw new Error("Custom verb requires both URI and description");
        }
        mappingPayload = {
          ...mappingPayload,
          verbId: { mode: "literal", value: customVerbIri.trim() },
          verbDisplay: { mode: "literal", value: customVerbDisplay.trim() || "custom" },
        };
      }
      const variables = parseMergedPlannerVariables(variablesText, templateSampleVars);
      const res = await fetch("/api/uri-library/statement-plans/lrs-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId: lrsTestConnectionId,
          mapping: mappingPayload,
          variables,
        }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "LRS test failed");
      }
      setLrsTestResult(data);
    } catch (e) {
      setLrsTestError(e instanceof Error ? e.message : "LRS test failed");
    } finally {
      setLrsTestLoading(false);
    }
  }

  async function voidLrsTestStatement() {
    setLrsVoidError(null);
    setLrsVoidResult(null);
    if (!lrsTestVoidable || !lrsTestConnectionId.trim()) {
      setLrsVoidError("Nothing to void, or LRS connection is missing.");
      return;
    }
    setLrsVoidLoading(true);
    try {
      const res = await fetch("/api/uri-library/statement-plans/lrs-void", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId: lrsTestConnectionId,
          voidedStatementId: lrsTestVoidable.statementId,
          actor: lrsTestVoidable.actor,
        }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Void request failed");
      }
      setLrsVoidResult(data);
    } catch (e) {
      setLrsVoidError(e instanceof Error ? e.message : "Void request failed");
    } finally {
      setLrsVoidLoading(false);
    }
  }

  function renderRefField(
    key: string,
    label: string,
    placeholder: string,
    opts?: { allowTemplate?: boolean; comfortable?: boolean },
  ) {
    const allowTemplate = opts?.allowTemplate ?? false;
    const comfortable = opts?.comfortable ?? false;
    const rawMode = (planMapping[key]?.mode ?? "literal") as RefMode;
    const mode: RefMode = !allowTemplate && rawMode === "template" ? "var" : rawMode;
    const val = planMapping[key]?.value ?? "";
    const showTemplatePicker = allowTemplate && mode === "template";
    return (
      <div key={key} className={`rounded-lg border border-slate-200 bg-slate-50 ${comfortable ? "p-4" : "p-3"}`}>
        <label className={comfortable ? "text-base font-medium text-slate-900" : "text-sm"}>{label}</label>
        <div
          className={
            comfortable
              ? "mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
              : "mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          }
        >
          <select
            className={
              comfortable
                ? "field !mt-0 w-full min-h-[48px] shrink-0 text-base sm:!w-40"
                : "field !mt-0 w-full min-h-[44px] shrink-0 text-sm sm:!w-36"
            }
            value={mode}
            onChange={(e) => {
              const nextMode = e.target.value as RefMode;
              if (!allowTemplate && nextMode === "template") return;
              setPlanMapping((prev) => {
                const prevVal = prev[key]?.value ?? "";
                let nextVal = prevVal;
                if (nextMode === "template" && allowTemplate) {
                  const first = templates[0]?.id ?? "";
                  nextVal = templates.some((t) => t.id === prevVal) ? prevVal : first;
                }
                return {
                  ...prev,
                  [key]: { mode: nextMode, value: nextVal },
                };
              });
            }}
          >
            <option value="literal">literal</option>
            <option value="var">var</option>
            {allowTemplate ? <option value="template">template</option> : null}
          </select>
          {showTemplatePicker ? (
            templates.length === 0 ? (
              <p className="text-sm text-amber-800">Save a URI template in the Templates tab first.</p>
            ) : (
              <SearchableTemplateSelect
                templates={templates}
                value={val}
                onChange={(id) =>
                  setPlanMapping((prev) => ({
                    ...prev,
                    [key]: { mode: "template", value: id },
                  }))
                }
              />
            )
          ) : (
            <input
              className={
                comfortable
                  ? "field !mt-0 min-h-[48px] w-full min-w-0 text-base sm:flex-1 sm:!w-auto"
                  : "field !mt-0 min-h-[44px] w-full min-w-0 text-sm sm:flex-1 sm:!w-auto"
              }
              value={val}
              onChange={(e) =>
                setPlanMapping((prev) => ({
                  ...prev,
                  [key]: { mode: (prev[key]?.mode ?? "literal") as RefMode, value: e.target.value },
                }))
              }
              placeholder={placeholder}
            />
          )}
        </div>
      </div>
    );
  }

  function editTemplate(t: Template) {
    setTemplateSaved(false);
    setEditingTemplateId(t.id);
    setName(t.name);
    setDescription(t.description ?? "");
    setCategory(t.category ?? "");
    setSourceType(t.sourceType);
    setBaseUrl(t.baseUrl);
    setSegments(t.segments);
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">URI Library</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Build, catalog, and organize xAPI URI templates with up to 50 slash-separated elements and variable
          placeholders from API payloads or course JavaScript.
        </p>
      </div>

      <div id="uri-template-save-feedback">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {info ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{info}</div> : null}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-zinc-700 pb-2" aria-label="URI Library sections">
        {(
          [
            ["templates", "URI templates"],
            ["storyline", "Storyline"],
            ["resolve", "Resolve"],
            ["planner", "Statement planner"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setUriLabSection(id)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              uriLabSection === id
                ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/40"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="text-xs text-zinc-500">
        {uriLabSection === "templates"
          ? "Define base URL and segments, then save. Saved templates are listed in this section."
          : null}
        {uriLabSection === "storyline"
          ? "Articulate Storyline: JavaScript, tenant token, manifest, sanity check, and validation events."
          : null}
        {uriLabSection === "resolve"
          ? "Resolve a template + variables JSON into a full IRI; optionally save to the URI catalog."
          : null}
        {uriLabSection === "planner"
          ? "Map variables to xAPI statement fields and preview JSON with optional spec checks."
          : null}
      </p>

      {uriLabSection === "templates" ? (
      <>
      <Reveal delayMs={40}>
        <form onSubmit={createTemplate} className="panel p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Template name</label>
              <input
                className="field"
                value={name}
                onChange={(e) => {
                  setTemplateSaved(false);
                  setName(e.target.value);
                }}
                required
              />
            </div>
            <div>
              <label className="text-sm">Base URL</label>
              <input
                className="field"
                value={baseUrl}
                onChange={(e) => {
                  setTemplateSaved(false);
                  setBaseUrl(e.target.value);
                }}
                required
              />
            </div>
            <div>
              <label className="text-sm">Category</label>
              <input
                className="field"
                value={category}
                onChange={(e) => {
                  setTemplateSaved(false);
                  setCategory(e.target.value);
                }}
                placeholder="e.g. learning/content/user"
              />
            </div>
            <div>
              <label className="text-sm">Source type</label>
              <select
                className="field"
                value={sourceType}
                onChange={(e) => {
                  setTemplateSaved(false);
                  setSourceType(e.target.value as "ANY" | "API" | "COURSE");
                }}
              >
                <option value="ANY">Any</option>
                <option value="API">API payload</option>
                <option value="COURSE">Course JavaScript</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description</label>
              <input
                className="field"
                value={description}
                onChange={(e) => {
                  setTemplateSaved(false);
                  setDescription(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">URI elements ({segments.length}/50)</div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => addSegment("static")} disabled={!canAddSegment}>+ Static</button>
                <button type="button" className="btn-secondary" onClick={() => addSegment("variable")} disabled={!canAddSegment}>+ Variable</button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {segments.map((seg, i) => (
                <div
                  key={`${i}-${seg.type}`}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveSegment(dragIndex, i);
                    setDragIndex(null);
                  }}
                  className="relative grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 pl-9 md:grid-cols-5"
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="opacity-80"
                    >
                      <circle cx="9" cy="6" r="1.6" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.6" fill="currentColor" />
                      <circle cx="9" cy="18" r="1.6" fill="currentColor" />
                      <circle cx="15" cy="6" r="1.6" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.6" fill="currentColor" />
                      <circle cx="15" cy="18" r="1.6" fill="currentColor" />
                    </svg>
                  </div>
                  <select className="field" value={seg.type} onChange={(e) => updateSegment(i, { type: e.target.value as Segment["type"] })}>
                    <option value="static">static</option>
                    <option value="variable">variable</option>
                  </select>
                  <input className="field md:col-span-2" value={seg.value} onChange={(e) => updateSegment(i, { value: e.target.value })} placeholder={seg.type === "static" ? "segment text" : "logical var name"} />
                  <input className="field md:col-span-2" value={seg.sourceKey ?? ""} onChange={(e) => updateSegment(i, { sourceKey: e.target.value })} placeholder="source key path (e.g. user.id)" />
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-600">Preview: <code>{previewUri || "Provide base URL"}</code></div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className={`btn-primary ${templateSaved && !savingTemplate ? "!bg-emerald-600 hover:!bg-emerald-500 !shadow-emerald-500/30" : ""}`}
              type="submit"
              disabled={savingTemplate}
            >
              {savingTemplate ? "Saving…" : templateSaved ? "Template Saved" : editingTemplateId ? "Update template" : "Save template"}
            </button>
            {editingTemplateId ? (
              <button
                type="button"
                onClick={() => {
                  setTemplateSaved(false);
                  setEditingTemplateId(null);
                }}
                className="btn-secondary"
              >
                Cancel edit
              </button>
            ) : null}
            <button type="button" onClick={refresh} className="btn-secondary">Refresh</button>
          </div>
        </form>
      </Reveal>

      <Reveal delayMs={50}>
        <div className="panel overflow-hidden" id="uri-templates-catalog">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Saved templates</div>
          <div className="p-4">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-slate-600">No templates yet.</div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    id={`uri-template-${t.id}`}
                    className={[
                      "rounded-lg border border-slate-200 bg-slate-50 p-3",
                      lastSavedTemplateId === t.id ? "ring-2 ring-emerald-300" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-600">{t.category ?? "uncategorized"} • {t.sourceType} • {t.active ? "active" : "inactive"}</div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn-secondary" onClick={() => editTemplate(t)}>Edit</button>
                        <button type="button" className="btn-secondary" onClick={() => void removeTemplate(t.id)}>Delete</button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-700">{t.baseUrl} / … ({t.segments.length} elements)</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Reveal>
      </>
      ) : null}

      {uriLabSection === "storyline" ? (
      <Reveal delayMs={40}>
        <div className="panel p-5">
          <div className="text-sm font-semibold text-slate-900">Storyline JavaScript generator</div>
          <p className="mt-1 text-xs text-slate-600">
            Uses the same URI template and variable segments as in <strong className="text-slate-800">URI templates</strong>. Configure the template there, then copy the script below into Storyline.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-700">Generated script</div>
            <button type="button" className="btn-secondary" onClick={() => void copyStorylineScript()}>
              {storylineCopied ? "Copied" : "Copy JavaScript"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Paste into Storyline&apos;s Execute JavaScript trigger. It reads variables via <code>player.GetVar</code>,
            posts them to this app for validation, and writes status back with <code>player.SetVar</code>.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm">App base URL</label>
              <input className="field" value={storylineAppBaseUrl} onChange={(e) => setStorylineAppBaseUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Validation token (tenant scoped)</label>
              <div className="mt-1 flex gap-2">
                <input className="field !mt-0 font-mono text-xs" value={storylineAuthToken} onChange={(e) => setStorylineAuthToken(e.target.value)} />
                <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => void refreshStorylineToken()}>
                  Regenerate
                </button>
              </div>
              {storylineTokenError ? <div className="mt-1 text-xs text-red-700">{storylineTokenError}</div> : null}
              {storylineTokenExpiresAt ? (
                <div className="mt-1 text-xs text-slate-600">
                  Expires: {new Date(storylineTokenExpiresAt).toLocaleString()}
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-sm">Status variable (SetVar)</label>
              <input className="field" value={storylineStatusVar} onChange={(e) => setStorylineStatusVar(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Resolved URI variable (SetVar)</label>
              <input className="field" value={storylineResolvedUriVar} onChange={(e) => setStorylineResolvedUriVar(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Error variable (SetVar)</label>
              <input className="field" value={storylineErrorVar} onChange={(e) => setStorylineErrorVar(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 rounded border border-slate-200 bg-white p-2">
            <div className="text-xs font-semibold text-slate-700">GetVar mappings from URI elements</div>
            {storylineMappings.length === 0 ? (
              <div className="mt-1 text-xs text-slate-500">Add variable URI elements in URI templates to generate mappings.</div>
            ) : (
              <div className="mt-1 text-xs text-slate-700">
                {storylineMappings.map((m) => (
                  <div key={`${m.storylineVar}:${m.path}`}>
                    <code>{m.storylineVar}</code> -&gt; <code>{m.path}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 rounded border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">Storyline variable manifest</div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={downloadStorylineManifestJson}>
                  Download JSON
                </button>
                <button type="button" className="btn-secondary" onClick={downloadStorylineManifestCsv}>
                  Download CSV
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Variable names are Storyline-safe alphanumeric only (example: <code>storeNum</code>, not <code>store.num</code>).
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-700">
                    <th className="px-2 py-1 font-semibold">Name</th>
                    <th className="px-2 py-1 font-semibold">Direction</th>
                    <th className="px-2 py-1 font-semibold">Type</th>
                    <th className="px-2 py-1 font-semibold">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {storylineManifestRows.map((row) => (
                    <tr key={`${row.direction}:${row.name}`} className="border-b border-slate-100 text-slate-700">
                      <td className="px-2 py-1">
                        <code>{row.name}</code>
                      </td>
                      <td className="px-2 py-1">{row.direction}</td>
                      <td className="px-2 py-1">
                        <select
                          className="field !mt-0 !w-[110px] !py-1"
                          value={row.type}
                          onChange={(e) =>
                            setStorylineVarTypeOverrides((prev) => ({
                              ...prev,
                              [row.name]: e.target.value as StorylineVariableType,
                            }))
                          }
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        {row.path ? <code>{row.path}</code> : <span className="text-slate-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <textarea readOnly className="field mt-3 min-h-[220px] font-mono text-xs" value={storylineScript} />
          <div className="mt-3 rounded border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700">Script + token sanity check</div>
              <button type="button" className="btn-secondary" onClick={() => void runStorylineSanityCheck()} disabled={storylineSanityRunning}>
                {storylineSanityRunning ? "Checking..." : "Run sanity check"}
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Sends a test payload to <code>/api/uri-library/storyline/validate</code> using your current template, mappings, and token.
            </div>
            {storylineSanityStatus ? <div className="mt-2 text-xs text-emerald-700">{storylineSanityStatus}</div> : null}
            {storylineSanityError ? <div className="mt-2 text-xs text-red-700">{storylineSanityError}</div> : null}
          </div>
          <div className="mt-3 rounded border border-slate-200 bg-white p-2">
            <div className="text-xs font-semibold text-slate-700">Recent Storyline validation events</div>
            {storylineEventsError ? (
              <div className="mt-1 text-xs text-red-700">{storylineEventsError}</div>
            ) : storylineEvents.length === 0 ? (
              <div className="mt-1 text-xs text-slate-500">No events yet. Run the generated script from Storyline to validate payload flow.</div>
            ) : (
              <div className="mt-2 space-y-1 text-xs">
                {storylineEvents.slice(0, 8).map((evt) => (
                  <div key={evt.id} className={`rounded border px-2 py-1 ${evt.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                    <div className="font-semibold">
                      {evt.ok ? "OK" : "ERROR"} - {new Date(evt.at).toLocaleTimeString()}
                    </div>
                    <div>source: <code>{evt.source}</code>{evt.templateId ? <> - template: <code>{evt.templateId}</code></> : null}</div>
                    {evt.iri ? <div>iri: <code>{evt.iri}</code></div> : null}
                    {evt.error ? <div>error: <code>{evt.error}</code></div> : null}
                    <div>variables: {evt.variableKeys.length ? evt.variableKeys.join(", ") : "(none)"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Reveal>
      ) : null}

      {uriLabSection === "resolve" ? (
      <Reveal delayMs={90}>
        <div className="panel p-5">
          <div className="text-sm font-semibold text-slate-900">Resolve URI from variables</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm">Template (optional)</label>
              <select className="field" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                <option value="">Use builder above</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} {t.category ? `(${t.category})` : ""}</option>
                ))}
              </select>
            </div>
            <div />
            <div className="md:col-span-2">
              <label className="text-sm">Variables (JSON)</label>
              <textarea className="field min-h-[120px] font-mono text-xs" value={variablesText} onChange={(e) => setVariablesText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Catalog label</label>
              <input className="field" value={resolveLabel} onChange={(e) => setResolveLabel(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Catalog category</label>
              <input className="field" value={resolveCategory} onChange={(e) => setResolveCategory(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => void resolveUri()} disabled={resolvingUri}>
              {resolvingUri ? "Resolving..." : "Resolve URI"}
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={catalogResolved} onChange={(e) => setCatalogResolved(e.target.checked)} />
              Save to URI catalog
            </label>
          </div>
          {selectedTemplateId ? (
            <div className="mt-2 text-xs text-slate-600">
              Variables JSON auto-fills from the selected template variable elements. Edit values, then click Resolve URI.
            </div>
          ) : null}
          {resolveError ? <div className="mt-2 text-sm text-red-700">{resolveError}</div> : null}
          {resolvedUri ? <div className="mt-3 text-sm text-slate-800">Resolved: <code>{resolvedUri}</code></div> : null}
        </div>
      </Reveal>
      ) : null}

      {uriLabSection === "planner" ? (
      <Reveal delayMs={130}>
        <form className="panel p-5" onSubmit={savePlan}>
          <div className="text-sm font-semibold text-slate-900">xAPI Statement Planner</div>
          <p className="mt-1 text-sm text-slate-600">
            Map incoming variables into actor/verb/object/result/context fields and preview the final JSON statement.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm">Plan name</label>
              <input className="field" value={planName} onChange={(e) => setPlanName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Linked URI template (optional)</label>
              <select className="field" value={planTemplateId} onChange={(e) => setPlanTemplateId(e.target.value)}>
                <option value="">None</option>
                {templates.map((t) => (
                  <option value={t.id} key={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description</label>
              <input className="field" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">Verb source</div>
            <p className="mt-1 text-xs text-slate-600">
              Choose from your verb registry (seeded from common xAPI verbs inspired by the Tin Can API Registry), or provide a custom verb.
            </p>
            <div className="mt-1 text-[11px] text-slate-600">
              Registry verbs available: <span className="font-semibold">{registryVerbs.length}</span>
              {verbs.length === 0 ? " (using UI fallback)" : ""}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <select
                className="field"
                value={verbSourceMode}
                onChange={(e) => {
                  const mode = e.target.value as "registry" | "custom";
                  setVerbSourceMode(mode);
                }}
              >
                <option value="registry">Select registry verb</option>
                <option value="custom">Custom verb</option>
              </select>
              {verbSourceMode === "registry" ? (
                <>
                  <select
                    className="field"
                    value={selectedRegistryIri}
                    onChange={(e) => {
                      const iri = e.target.value;
                      setSelectedRegistryIri(iri);
                      const selected = registryVerbs.find((v) => v.iri === iri);
                      if (selected) {
                        setCustomVerbIri(selected.iri);
                        setCustomVerbDescription(selected.description ?? "");
                        setPlanMapping((prev) => ({
                          ...prev,
                          verbId: { mode: "literal", value: selected.iri },
                          verbDisplay: { mode: "literal", value: selected.display },
                        }));
                      }
                    }}
                  >
                    <option value="">Display</option>
                    {registryVerbs.map((v) => (
                      <option key={v.iri} value={v.iri}>
                        {v.display}
                      </option>
                    ))}
                  </select>
                  <input className="field" value={customVerbIri} readOnly placeholder="Verb URI" />
                  <input className="field" value={customVerbDescription} readOnly placeholder="Description" />
                </>
              ) : (
                <>
                  <select
                    className="field"
                    value={selectedCustomVerbIri}
                    onChange={(e) => {
                      const iri = e.target.value;
                      setSelectedCustomVerbIri(iri);
                      const selected = customVerbs.find((v) => v.iri === iri);
                      if (!selected) return;
                      setCustomVerbDisplay(selected.display);
                      setCustomVerbIri(selected.iri);
                      setCustomVerbDescription(selected.description);
                      setPlanMapping((prev) => ({
                        ...prev,
                        verbId: { mode: "literal", value: selected.iri },
                        verbDisplay: { mode: "literal", value: selected.display },
                      }));
                    }}
                  >
                    <option value="">Existing custom verbs...</option>
                    {customVerbs.map((v) => (
                        <option key={v.iri} value={v.iri}>
                          {v.display} (custom)
                        </option>
                      ))}
                  </select>
                  <input className="field" value={customVerbDisplay} onChange={(e) => setCustomVerbDisplay(e.target.value)} placeholder="Display" />
                  <input className="field" value={customVerbIri} onChange={(e) => setCustomVerbIri(e.target.value)} placeholder="Custom verb IRI" />
                  <div className="flex gap-2">
                    <input className="field" value={customVerbDescription} onChange={(e) => setCustomVerbDescription(e.target.value)} placeholder="Description" />
                    <button type="button" className="btn-secondary" onClick={() => void saveCustomVerb()}>
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">Default required fields</div>
            <p className="mt-1 text-xs text-slate-600">
              Minimum statement: actor + verb + object. Choose exactly one actor identifier (IFI). Account IFI fields
              support <strong>literal</strong> or <strong>var</strong> only. Only <strong>Object IRI</strong> can use a
              saved URI <strong>template</strong>. Storyline variables are validated after resolution in Preview JSON.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                <label className="text-sm font-medium text-slate-900">Actor identifier (choose one)</label>
                <select
                  className="field mt-1"
                  value={actorIfiType}
                  onChange={(e) => setActorIfiType(e.target.value as ActorIfiType)}
                >
                  <option value="mbox">mbox (mailto IRI)</option>
                  <option value="mbox_sha1sum">mbox_sha1sum (SHA-1 hex of mailto IRI)</option>
                  <option value="openid">openid (URI)</option>
                  <option value="account">account (homePage + name)</option>
                </select>
                <p className="mt-2 text-xs text-slate-600">
                  {actorIfiType === "mbox"
                    ? "Value must resolve to a mailto IRI (e.g. mailto:user@example.com). Bare user@domain is normalized to mailto: in the preview."
                    : null}
                  {actorIfiType === "mbox_sha1sum"
                    ? "40 hex characters: SHA-1 of the UTF-8 mailto IRI (e.g. SHA-1 of mailto:user@example.com), not of the raw email alone."
                    : null}
                  {actorIfiType === "openid" ? "Must resolve to a valid absolute URI (openid IRI)." : null}
                  {actorIfiType === "account"
                    ? "Sends actor.account as { homePage, name }. homePage must be a URI; name is the account id string."
                    : null}
                </p>
                {actorIfiType === "mbox" ? renderRefField("actorMbox", "mbox", "mailto:learner@example.com or actor.mbox") : null}
                {actorIfiType === "mbox_sha1sum"
                  ? renderRefField("actorMboxSha1sum", "mbox_sha1sum (40 hex chars)", "actor.mboxSha1sum")
                  : null}
                {actorIfiType === "openid" ? renderRefField("actorOpenid", "openid", "https://openid.example.com/user") : null}
                {actorIfiType === "account" ? (
                  <div className="mt-2 space-y-4">
                    {renderRefField("actorAccountHomePage", "Account homePage (URI)", "https://lms.example.com", {
                      comfortable: true,
                    })}
                    {renderRefField("actorAccountName", "Account name", "learner.login", { comfortable: true })}
                  </div>
                ) : null}
              </div>
              <div className="md:col-span-2">
                {renderRefField("objectId", "Object IRI", "object.id", { allowTemplate: true })}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">Add optional components</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {[
                ["objectDefinition", "Object definition"],
                ["result", "Result"],
                ["context", "Context"],
                ["metadata", "Metadata"],
                ["stored", "Stored"],
                ["authority", "Authority"],
                ["version", "Version"],
                ["attachments", "Attachments"],
              ].map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                  <input
                    type="checkbox"
                    checked={plannerExtras[key]}
                    onChange={(e) => setPlannerExtras((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {plannerExtras.objectDefinition ? (
              <>
                {renderRefField("objectDefinitionName", "Object definition name", "object.name")}
                {renderRefField("objectDefinitionDescription", "Object definition description", "object.description")}
                {renderRefField("objectDefinitionType", "Object definition type", "object.definition.type")}
                {renderRefField("objectDefinitionMoreInfo", "Object definition moreInfo", "object.definition.moreInfo")}
              </>
            ) : null}
            {plannerExtras.result ? (
              <>
                {renderRefField("resultScoreRaw", "Result score raw", "result.score.raw")}
                {renderRefField("resultScoreScaled", "Result score scaled", "result.score.scaled")}
                {renderRefField("resultScoreMin", "Result score min", "result.score.min")}
                {renderRefField("resultScoreMax", "Result score max", "result.score.max")}
                {renderRefField("resultSuccess", "Result success (true/false)", "result.success")}
                {renderRefField("resultCompletion", "Result completion (true/false)", "result.completion")}
                {renderRefField("resultResponse", "Result response", "result.response")}
                {renderRefField("resultDuration", "Result duration (ISO8601)", "result.duration")}
              </>
            ) : null}
            {plannerExtras.context ? (
              <>
                {renderRefField("contextRegistration", "Context registration", "context.registration")}
                {renderRefField("contextJson", "Context JSON object", "{\"contextActivities\":{}}")}
              </>
            ) : null}
            {plannerExtras.metadata ? renderRefField("metadataJson", "Metadata JSON (merged into object.definition)", "{\"extensions\":{}}") : null}
            {plannerExtras.stored ? renderRefField("stored", "Stored timestamp", "2026-03-26T00:00:00.000Z") : null}
            {plannerExtras.authority ? renderRefField("authorityJson", "Authority JSON (Agent/Group)", "{\"objectType\":\"Agent\",\"mbox\":\"mailto:lrs@example.com\"}") : null}
            {plannerExtras.version ? renderRefField("version", "Statement version", "1.0.3") : null}
            {plannerExtras.attachments ? renderRefField("attachmentsJson", "Attachments JSON array", "[{\"usageType\":\"https://...\"}]") : null}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={specModeEnabled} onChange={(e) => setSpecModeEnabled(e.target.checked)} />
              Spec mode checklist (xAPI MUST/SHOULD)
            </label>
            <p className="mt-1 text-xs text-slate-600">
              Runs validation on preview for required actor/verb/object, IFI structure, IRI formatting, version, and null handling.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" type="submit">Save plan</button>
            <button type="button" className="btn-secondary" onClick={() => void previewPlan()}>Preview JSON</button>
          </div>
          {specModeEnabled ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <div className="font-semibold text-slate-800">Spec checks</div>
                {specValidation.errors.length === 0 && specValidation.warnings.length === 0 ? (
                  <div className="mt-1 text-slate-600">Run Preview JSON to evaluate this plan against core spec checks.</div>
                ) : null}
                {specValidation.errors.length > 0 ? (
                  <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-red-900">
                    <div className="font-semibold">MUST issues</div>
                    <ul className="mt-1 list-disc pl-4">
                      {specValidation.errors.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {specValidation.warnings.length > 0 ? (
                  <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    <div className="font-semibold">SHOULD recommendations</div>
                    <ul className="mt-1 list-disc pl-4">
                      {specValidation.warnings.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {planPreview ? (
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{planPreview}</pre>
          ) : null}
          {plannerTemplateVarKeys.length > 0 ? (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/90 p-3">
              <div className="text-sm font-semibold text-slate-900">Template variable samples</div>
              <p className="mt-1 text-xs text-slate-600">
                At least one field uses <strong>template</strong> mode. Fill sample values for each URI segment variable (keys match the template builder). These merge with the Variables JSON from the Resolve tab for Preview JSON and LRS live test.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {plannerTemplateVarKeys.map((k) => (
                  <div key={k}>
                    <label className="text-xs font-medium text-slate-700">{k}</label>
                    <input
                      className="field !mt-0 text-xs"
                      value={templateSampleVars[k] ?? ""}
                      onChange={(e) =>
                        setTemplateSampleVars((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                      placeholder={`Sample value for ${k}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">LRS live test</div>
            <p className="mt-1 text-xs text-slate-600">
              POSTs the same statement as <strong>Preview JSON</strong> (mapping + merged variables + template resolutions) to your LRS using Basic auth, identical to Connections validation except the payload is your plan. Ensure Variables JSON and template samples supply every path your mapping needs. On success, the response includes <code>postUrl</code> and <code>statementPosted</code>. The connection must use your LRS <strong>xAPI base URL</strong> (e.g. ending in <code>/xAPI</code>).
            </p>
            {lrsConnections.length === 0 ? (
              <p className="mt-2 text-xs text-slate-600">
                No LRS connections yet.{" "}
                <a href="/app/connections" className="font-medium text-orange-600 underline hover:text-orange-500">
                  Add an xAPI LRS (Basic) connection
                </a>{" "}
                first.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <label className="text-sm">LRS connection</label>
                  <select
                    className="field mt-1"
                    value={lrsTestConnectionId}
                    onChange={(e) => setLrsTestConnectionId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {lrsConnections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={lrsTestLoading || !lrsTestConnectionId}
                  onClick={() => void sendStatementToLrs()}
                >
                  {lrsTestLoading ? "Sending…" : "Send test statement"}
                </button>
              </div>
            )}
            {lrsTestError ? <div className="mt-2 text-xs text-red-700">{lrsTestError}</div> : null}
            {lrsTestResult ? (
              <>
                <pre className="mt-3 max-h-[360px] overflow-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-800">
                  {JSON.stringify(lrsTestResult, null, 2)}
                </pre>
                {lrsTestVoidable ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-900">Void test statement</div>
                    <p className="mt-1 text-xs text-slate-600">
                      Per xAPI, voiding posts a new statement using the{" "}
                      <code className="rounded bg-slate-100 px-1">http://adlnet.gov/expapi/verbs/voided</code> verb whose
                      object is a <code className="rounded bg-slate-100 px-1">StatementRef</code> to the statement you
                      just sent. The actor matches your test statement so the LRS can accept the void.
                    </p>
                    <button
                      type="button"
                      className="btn-secondary mt-2"
                      disabled={lrsVoidLoading || !lrsTestConnectionId}
                      onClick={() => void voidLrsTestStatement()}
                    >
                      {lrsVoidLoading ? "Voiding…" : "Void this statement in the LRS"}
                    </button>
                  </div>
                ) : null}
                {lrsVoidError ? <div className="mt-2 text-xs text-red-700">{lrsVoidError}</div> : null}
                {lrsVoidResult ? (
                  <pre className="mt-2 max-h-[280px] overflow-auto rounded border border-emerald-200 bg-emerald-50/80 p-2 text-xs text-slate-800">
                    {JSON.stringify(lrsVoidResult, null, 2)}
                  </pre>
                ) : null}
              </>
            ) : null}
          </div>
          {plans.length > 0 ? <div className="mt-2 text-xs text-slate-600">{plans.length} saved statement plan(s).</div> : null}
        </form>
      </Reveal>
      ) : null}
    </div>
  );
}

