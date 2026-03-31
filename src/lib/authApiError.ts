/** Maps `/api/auth/*` JSON errors (including Zod issues) to a single user-visible string. */
export function messageFromAuthResponse(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const o = data as {
    error?: string;
    detail?: string;
    issues?: Array<{ message?: string }>;
  };
  if (o.detail) return `${o.error ?? "Error"}: ${o.detail}`;
  if (o.issues?.length) {
    const parts = o.issues.map((i) => i.message).filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return o.error ?? "Request failed";
}
