import fs from "fs";
import os from "os";
import path from "path";

import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;
const MAX_FILE_COUNT = 400;

export type SurgeryExtra = { relativePath: string; data: Buffer };

export type SurgeryResult =
  | { ok: true; zipBuffer: Buffer; report: string[] }
  | { ok: false; error: string };

function xmlEscapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Package-relative posix path; rejects traversal. */
export function safePackagePath(input: string): string {
  const trimmed = input.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.startsWith("/")) {
    throw new Error(`Invalid path: ${input}`);
  }
  const segments = trimmed.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "..") throw new Error(`Path cannot contain "..": ${input}`);
  }
  return segments.join("/");
}

function countZipUncompressed(zip: AdmZip): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    files += 1;
    bytes += e.header.size;
    if (bytes > MAX_UNCOMPRESSED_BYTES) break;
  }
  return { bytes, files };
}

function extractZipToDir(zip: AdmZip, dir: string): void {
  let total = 0;
  let count = 0;
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    count += 1;
    if (count > MAX_FILE_COUNT) {
      throw new Error(`Package contains too many files (max ${MAX_FILE_COUNT}).`);
    }
    const rel = safePackagePath(e.entryName);
    const dest = path.join(dir, rel);
    const parent = path.dirname(dest);
    fs.mkdirSync(parent, { recursive: true });
    const data = e.getData();
    total += data.length;
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new Error(`Uncompressed package too large (max ${MAX_UNCOMPRESSED_BYTES} bytes).`);
    }
    fs.writeFileSync(dest, data);
  }
}

function findStoryHtmlPath(root: string): string | null {
  const candidates: string[] = [];
  function walk(d: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.toLowerCase() === "story.html") {
        candidates.push(full);
      }
    }
  }
  walk(root);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
  return candidates[0];
}

function findManifestPath(root: string): string | null {
  const direct = path.join(root, "imsmanifest.xml");
  if (fs.existsSync(direct)) return direct;
  let found: string | null = null;
  function walk(d: string) {
    if (found) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.toLowerCase() === "imsmanifest.xml") {
        found = full;
        return;
      }
    }
  }
  walk(root);
  return found;
}

/**
 * Insert <file href="..."/> before the closing </resource> of the resource that launches story.html.
 */
export function injectManifestFileRefs(manifestXml: string, hrefs: string[]): string {
  if (hrefs.length === 0) return manifestXml;
  const fileTags = hrefs.map((h) => `      <file href="${xmlEscapeAttr(h)}"/>`).join("\n");
  const resourceOpen =
    /<resource\b[^>]*\bhref=["'](?:\.\/)?story\.html["'][^>]*>/i;
  const m = manifestXml.match(resourceOpen);
  if (!m || m.index === undefined) {
    throw new Error(
      'Could not find a <resource href="story.html"> entry in imsmanifest.xml. Is this an Articulate Storyline SCORM package?',
    );
  }
  const start = m.index + m[0].length;
  const closeIdx = manifestXml.indexOf("</resource>", start);
  if (closeIdx === -1) {
    throw new Error("Could not find closing </resource> for the story.html resource.");
  }
  const prefix = "\n";
  return manifestXml.slice(0, closeIdx) + prefix + fileTags + "\n" + manifestXml.slice(closeIdx);
}

function injectStoryHtmlAssets(html: string, hrefs: string[]): string {
  if (hrefs.length === 0) return html;
  const lines: string[] = [];
  for (const h of hrefs) {
    const lower = h.toLowerCase();
    if (lower.endsWith(".css")) {
      lines.push(`<link rel="stylesheet" href="${xmlEscapeAttr(h)}"/>`);
    } else if (lower.endsWith(".js")) {
      lines.push(`<script charset="utf-8" src="${xmlEscapeAttr(h)}"></script>`);
    }
  }
  if (lines.length === 0) return html;
  const block = `\n    <!-- xAPIvate Post-Publish Surgery -->\n    ${lines.join("\n    ")}\n`;
  const headClose = /<\/head>/i;
  if (headClose.test(html)) {
    return html.replace(headClose, `${block}</head>`);
  }
  const htmlOpen = /<html[^>]*>/i;
  if (htmlOpen.test(html)) {
    return html.replace(htmlOpen, (m) => `${m}<head>${block}</head>`);
  }
  return `${block}${html}`;
}

function validateWellFormedXml(xml: string): void {
  const parser = new XMLParser({ ignoreAttributes: false });
  try {
    parser.parse(xml);
  } catch (e) {
    throw new Error(`imsmanifest.xml is not valid XML after update: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function zipDirectoryToBuffer(root: string): Buffer {
  const zip = new AdmZip();
  function addDir(absDir: string, zipPrefix: string) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const ent of entries) {
      const abs = path.join(absDir, ent.name);
      const zname = zipPrefix ? `${zipPrefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        addDir(abs, zname.replace(/\\/g, "/"));
      } else {
        zip.addFile(zname.replace(/\\/g, "/"), fs.readFileSync(abs));
      }
    }
  }
  addDir(root, "");
  return zip.toBuffer();
}

function structuralReport(root: string, manifestPath: string, storyPath: string, added: string[]): string[] {
  const report: string[] = [];
  report.push(`Manifest: ${path.relative(root, manifestPath) || "imsmanifest.xml"}`);
  report.push(`story.html: ${path.relative(root, storyPath) || "story.html"}`);
  report.push(`Injected file references: ${added.length ? added.join(", ") : "(none)"}`);
  const manifest = fs.readFileSync(manifestPath, "utf8");
  validateWellFormedXml(manifest);
  report.push("imsmanifest.xml parses as XML after surgery.");
  const html = fs.readFileSync(storyPath, "utf8");
  if (!/<html[\s>]/i.test(html)) {
    report.push("Warning: story.html may be missing <html> root.");
  } else {
    report.push("story.html still contains an <html> document.");
  }
  for (const rel of added) {
    const p = path.join(root, ...rel.split("/"));
    if (!fs.existsSync(p)) {
      report.push(`Warning: file missing on disk: ${rel}`);
    }
  }
  report.push(
    "Runtime test: not executed on the server. Launch the downloaded package in your LMS or SCORM Cloud to confirm playback.",
  );
  return report;
}

export async function runPostPublishSurgery(
  scormZipBuffer: Buffer,
  extras: SurgeryExtra[],
): Promise<SurgeryResult> {
  if (scormZipBuffer.length > MAX_ZIP_BYTES) {
    return { ok: false, error: `SCORM zip exceeds ${MAX_ZIP_BYTES / (1024 * 1024)} MB limit.` };
  }
  let zip: AdmZip;
  try {
    zip = new AdmZip(scormZipBuffer);
  } catch {
    return { ok: false, error: "Could not read SCORM zip. Is it a valid .zip file?" };
  }
  const { bytes, files } = countZipUncompressed(zip);
  if (files > MAX_FILE_COUNT) {
    return { ok: false, error: `Package has too many files (${files}; max ${MAX_FILE_COUNT}).` };
  }
  if (bytes > MAX_UNCOMPRESSED_BYTES) {
    return { ok: false, error: "Uncompressed package size exceeds limit." };
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pps-scorm-"));
  try {
    extractZipToDir(zip, tmp);

    for (const ex of extras) {
      const rel = safePackagePath(ex.relativePath);
      const dest = path.join(tmp, rel);
      const parent = path.dirname(dest);
      fs.mkdirSync(parent, { recursive: true });
      fs.writeFileSync(dest, ex.data);
    }

    const manifestPath = findManifestPath(tmp);
    if (!manifestPath) {
      return { ok: false, error: "imsmanifest.xml not found in package." };
    }
    const storyPath = findStoryHtmlPath(tmp);
    if (!storyPath) {
      return { ok: false, error: "story.html not found in package." };
    }

    const addedRel = extras.map((e) => safePackagePath(e.relativePath));
    const manifestXml = fs.readFileSync(manifestPath, "utf8");
    const updatedManifest = injectManifestFileRefs(manifestXml, addedRel);
    validateWellFormedXml(updatedManifest);
    fs.writeFileSync(manifestPath, updatedManifest, "utf8");

    const storyHtml = fs.readFileSync(storyPath, "utf8");
    const assetHrefs = addedRel.filter((p) => /\.(js|css)$/i.test(p));
    const updatedStory = injectStoryHtmlAssets(storyHtml, assetHrefs);
    fs.writeFileSync(storyPath, updatedStory, "utf8");

    const report = structuralReport(tmp, manifestPath, storyPath, addedRel);
    fs.writeFileSync(
      path.join(tmp, "POST_PUBLISH_SURGERY_REPORT.txt"),
      report.join("\n"),
      "utf8",
    );
    const outZip = zipDirectoryToBuffer(tmp);
    return { ok: true, zipBuffer: outZip, report };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
