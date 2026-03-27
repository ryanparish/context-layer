import { cookies } from "next/headers";

import { getSessionCookieName, verifySession } from "@/server/auth/session";
import AppNav from "@/app/app/AppNav";
import ScrollProgress from "@/components/ui/ScrollProgress";
import HealthStatusBanner from "@/components/ui/HealthStatusBanner";

async function getSession() {
  const jar = await cookies();
  const token = jar.get(getSessionCookieName())?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <ScrollProgress />
      <aside className="w-72 border-r border-zinc-800 bg-zinc-950 p-5">
        <div className="text-2xl font-semibold leading-none tracking-tight text-zinc-100 [font-family:var(--font-rethink-sans)]">
          <span>x</span>
          <span className="font-bold text-orange-300">api</span>
          <span>vate</span>
        </div>
        <div className="mt-3 inline-flex rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300 ring-1 ring-orange-500/30">
          {session ? `${session.role}` : "Signed out"}
        </div>

        <AppNav />

        <form action="/api/auth/logout" method="post" className="mt-10">
          <button className="btn-secondary-dark w-full" type="submit">
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8 text-zinc-100">
        <HealthStatusBanner />
        {children}
      </main>
    </div>
  );
}

