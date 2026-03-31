"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLeaf = {
  href: string;
  label: string;
  isActive?: (pathname: string) => boolean;
};

type NavEntry =
  | { kind: "link"; href: string; label: string }
  | { kind: "group"; heading: string; items: NavLeaf[] };

const entries: NavEntry[] = [
  { kind: "link", href: "/app", label: "Overview" },
  { kind: "link", href: "/app/connections", label: "Connections" },
  { kind: "link", href: "/app/xapi", label: "xAPI Stream" },
  { kind: "link", href: "/app/uri-library", label: "URI Library" },
  {
    kind: "group",
    heading: "Storyline xAPI",
    items: [
      {
        href: "/app/storyline",
        label: "Bridges & JavaScript",
        isActive: (p) =>
          p.startsWith("/app/storyline") &&
          p !== "/app/storyline/post-publish-surgery" &&
          !p.startsWith("/app/storyline/post-publish-surgery/"),
      },
      {
        href: "/app/storyline/post-publish-surgery",
        label: "Post-Publish Surgery",
        isActive: (p) =>
          p === "/app/storyline/post-publish-surgery" ||
          p.startsWith("/app/storyline/post-publish-surgery/"),
      },
    ],
  },
  { kind: "link", href: "/app/automations", label: "Automations" },
  { kind: "link", href: "/app/settings", label: "Settings" },
];

function defaultLeafActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/app" && pathname.startsWith(href));
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1 text-sm">
      {entries.map((entry) => {
        if (entry.kind === "link") {
          const active = defaultLeafActive(pathname, entry.href);
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
        }

        return (
          <div key={entry.heading} className="space-y-1 pt-1">
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{entry.heading}</div>
            {entry.items.map((item) => {
              const active = item.isActive ? item.isActive(pathname) : defaultLeafActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  className={`block rounded-lg py-2 pl-5 pr-3 transition ${
                    active ? "bg-orange-600 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
