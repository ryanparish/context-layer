"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/contact", label: "Contact" },
];

type MeUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  authVia?: "session" | "api_key";
};

export default function PublicNav() {
  const pathname = usePathname();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/me", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ user: MeUser | null }>)
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setAuthReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-3xl font-semibold leading-none tracking-tight text-zinc-100 [font-family:var(--font-rethink-sans)]"
          aria-label="xapivate brand"
        >
          <span>x</span>
          <span className="font-bold text-orange-300">api</span>
          <span>vate</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-orange-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex min-h-[40px] items-center gap-2">
          {!authReady ? (
            <span className="h-9 w-28 animate-pulse rounded-lg bg-zinc-800/80" aria-hidden />
          ) : user ? (
            <form action="/api/auth/logout" method="post" className="inline">
              <button type="submit" className="btn-secondary-dark">
                Log out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="btn-secondary-dark">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

