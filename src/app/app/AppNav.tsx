"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app", label: "Overview" },
  { href: "/app/connections", label: "Connections" },
  { href: "/app/xapi", label: "xAPI Stream" },
  { href: "/app/uri-library", label: "URI Library" },
  { href: "/app/storyline", label: "Storyline xAPI" },
  { href: "/app/automations", label: "Automations" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1 text-sm">
      {links.map((link) => {
        const active =
          pathname === link.href || (link.href !== "/app" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            className={`block rounded-lg px-3 py-2 transition ${
              active
                ? "bg-orange-600 text-white shadow-sm"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

