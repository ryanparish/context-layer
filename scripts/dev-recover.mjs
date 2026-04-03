#!/usr/bin/env node
/**
 * Local dev “hard refresh” when Next.js/Turbopack misbehaves or the app won’t load.
 *
 * Usage:
 *   npm run dev:recover          — free port 3000 + delete .next
 *   npm run dev:recover:full     — same + restart Docker (Postgres + Redis)
 *
 * Then start the app: npm run dev   (Webpack by default; use npm run dev:turbo to try Turbopack)
 *
 * If problems persist: npm run preflight   and   npx prisma generate
 *
 * Symptom: HTTP 500 + ENOENT routes-manifest.json / pages-manifest.json in
 * .next/dev/logs/next-development.log — usually .next was deleted while
 * `next dev` was still running. Fix: stop all dev processes, then run this script.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nextDir = path.join(root, ".next");

const args = process.argv.slice(2);
const withDocker = args.includes("--docker");

/** Ports Next commonly uses when one is taken (3000 → 3001). */
const DEV_PORTS = [3000, 3001];

function sh(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
    ...opts,
  });
  return (r.status ?? 1) === 0;
}

function listenPids(port) {
  const p = spawnSync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
  return (p.stdout || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

console.log("==> dev-recover: stopping listeners on ports " + DEV_PORTS.join(", ") + "\n");
if (process.platform !== "win32") {
  const collectPids = () => {
    const set = new Set();
    for (const port of DEV_PORTS) {
      for (const pid of listenPids(port)) set.add(pid);
    }
    return [...set];
  };
  let pids = collectPids();
  for (const pid of pids) {
    spawnSync("kill", [pid], { stdio: "inherit" });
  }
  {
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, 1000);
  }
  pids = collectPids();
  for (const pid of pids) {
    spawnSync("kill", ["-9", pid], { stdio: "inherit" });
  }
  if (collectPids().length) {
    console.warn("⚠ Some process(es) still listening on 3000/3001; try `lsof -iTCP:3000 -sTCP:LISTEN`\n");
  }
} else {
  console.log("    (skip automatic port kill on Windows; stop Node on :3000 / :3001 manually if needed)\n");
}

console.log("==> dev-recover: removing .next cache\n");
try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("✔ .next removed\n");
} catch (e) {
  console.warn("⚠ could not remove .next:", e instanceof Error ? e.message : e, "\n");
}

if (withDocker) {
  console.log("==> dev-recover: docker compose down && up -d\n");
  if (!sh("docker", ["compose", "down"])) {
    console.error("✖ docker compose down failed (is Docker running?)\n");
    process.exit(1);
  }
  if (!sh("docker", ["compose", "up", "-d"])) {
    console.error("✖ docker compose up failed\n");
    process.exit(1);
  }
  console.log("✔ Postgres + Redis containers restarted\n");
}

console.log("==> Next steps:\n");
console.log("    npm run dev\n");
console.log("    After \"Ready\", wait ~20s (or until \"Compiled /\" in the log) before opening the browser.\n");
console.log("    Opening too early can 500 with missing middleware-manifest.json.\n");
console.log("    If compile hangs forever: ensure you are on `npm run dev` (Webpack), not dev:turbo\n");
console.log("    If DB/env errors: npm run preflight\n");
