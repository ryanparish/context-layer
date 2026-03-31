import { NextResponse } from "next/server";
import AdmZip from "adm-zip";

import { requireSession } from "@/server/auth/requireSession";
import {
  runPostPublishSurgery,
  safePackagePath,
  type SurgeryExtra,
} from "@/server/storyline/postPublishSurgery";

export const runtime = "nodejs";
export const maxDuration = 120;

function mergeExtrasZip(buffer: Buffer): SurgeryExtra[] {
  const out: SurgeryExtra[] = [];
  const z = new AdmZip(buffer);
  for (const e of z.getEntries()) {
    if (e.isDirectory) continue;
    try {
      const rel = safePackagePath(e.entryName);
      out.push({ relativePath: rel, data: e.getData() });
    } catch {
      // skip invalid paths (e.g. traversal)
    }
  }
  return out;
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse multipart body. The upload may be too large for this server." },
      { status: 400 },
    );
  }

  const scorm = form.get("scorm");
  if (!(scorm instanceof File) || scorm.size === 0) {
    return NextResponse.json({ error: "Missing or empty SCORM file (.zip)." }, { status: 400 });
  }

  const byPath = new Map<string, Buffer>();

  const extrasZipField = form.get("extrasZip");
  if (extrasZipField instanceof File && extrasZipField.size > 0) {
    try {
      const buf = Buffer.from(await extrasZipField.arrayBuffer());
      for (const ex of mergeExtrasZip(buf)) {
        byPath.set(ex.relativePath, ex.data);
      }
    } catch {
      return NextResponse.json({ error: "Could not read the extras .zip file." }, { status: 400 });
    }
  }

  const pathFields = form.getAll("extraPath");
  const fileFields = form.getAll("extraFile");
  const n = Math.max(pathFields.length, fileFields.length);
  for (let i = 0; i < n; i++) {
    const pRaw = pathFields[i];
    const f = fileFields[i];
    const p = typeof pRaw === "string" ? pRaw : "";
    if (!(f instanceof File) || f.size === 0 || !p.trim()) continue;
    try {
      const rel = safePackagePath(p);
      byPath.set(rel, Buffer.from(await f.arrayBuffer()));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Invalid extra path "${p}": ${msg}` }, { status: 400 });
    }
  }

  const extras: SurgeryExtra[] = [...byPath.entries()].map(([relativePath, data]) => ({
    relativePath,
    data,
  }));

  const scormBuf = Buffer.from(await scorm.arrayBuffer());
  const result = await runPostPublishSurgery(scormBuf, extras);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const baseName = scorm.name.replace(/\.zip$/i, "") || "scorm-package";
  const filename = `${baseName}-post-publish-surgery.zip`;
  const summary = `Injected ${extras.length} file(s). Structural checks passed; see POST_PUBLISH_SURGERY_REPORT.txt in the zip.`;
  const reportEncoded = encodeURIComponent(result.report.join("\n"));

  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
  headers.set("X-Surgery-Summary", summary);
  if (reportEncoded.length < 6000) {
    headers.set("X-Surgery-Report", reportEncoded);
  }

  return new NextResponse(new Uint8Array(result.zipBuffer), { status: 200, headers });
}
