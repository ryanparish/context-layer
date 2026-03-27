export function stripProtocol(host: string) {
  return host.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function ensureHttps(url: string) {
  const t = url.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
