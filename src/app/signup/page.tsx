"use client";

import { useState } from "react";

import { messageFromAuthResponse } from "@/lib/authApiError";

export default function SignupPage() {
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantName, tenantSlug, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(messageFromAuthResponse(data));
      }
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-100 to-zinc-200/60 px-4 py-12">
      <div className="panel w-full max-w-md p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Create your tenant</h1>
        <p className="mt-1 text-sm text-slate-700">
          This creates a tenant and an Owner user.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm">Tenant name</label>
            <input
              className="field"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div>
            <label className="text-sm">Tenant slug</label>
            <input
              className="field"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="acme"
              required
            />
            <div className="mt-1 text-xs text-slate-600">
              Lowercase letters, numbers, and dashes.
            </div>
          </div>
          <div>
            <label className="text-sm">Owner email</label>
            <input
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              required
            />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <button
            className="btn-primary w-full"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating..." : "Create tenant"}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-700">
          Already have an account?{" "}
          <a className="font-semibold text-slate-900 underline" href="/login">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

