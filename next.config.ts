import type { NextConfig } from "next";

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
  // Avoid picking the wrong workspace root when another lockfile exists (e.g. under $HOME).
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // Default dev cache writes pack files under `.next/dev/cache/webpack/*` and renames `*.pack.gz_`
  // → `*.pack.gz`. iCloud Drive / Desktop & Documents sync often breaks that rename (ENOENT).
  // Memory cache avoids on-disk packs; dev is slightly slower on cold start but stable on synced folders.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
