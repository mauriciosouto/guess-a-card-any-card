import type { NextConfig } from "next";

function apiProxyBase(): string {
  const explicit = process.env.API_PROXY_TARGET?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  // Local monorepo: API runs on8787 (`npm run dev:api`). Without this, `/api/*` hits Next and 404s.
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8787";
  }
  return "";
}

const nextConfig: NextConfig = {
  transpilePackages: ["@gac/shared"],
  async rewrites() {
    const base = apiProxyBase();
    if (!base) return [];
    return [{ source: "/api/:path*", destination: `${base}/api/:path*` }];
  },
};

export default nextConfig;
