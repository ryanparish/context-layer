"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const entries = [
  { href: "/app", label: "Overview" },
  { href: "/app/connections", label: "Connections" },
  { href: "/app/xapi", label: "xAPI Stream" },
  { href: "/app/uri-library", label: "URI Library" },
  { href: "/app/storyline", label: "Storyline xAPI" },
  { href: "/app/automations", label: "Automations" },
  { href: "/app/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/app" && pathname.startsWith(href));
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1 text-sm">
      {entries.map((entry) => {
        const active = isActive(pathname, entry.href);
        return (
          <Link
            key={entry.href}
            className={`block rounded-lg px-3 py-2 transition ${
              active ? "bg-orange-600 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
            href={entry.href}
          >
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
