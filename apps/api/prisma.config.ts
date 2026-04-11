import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma loads this file with c12 `dotenv: false` — it never auto-loads `.env`.
 * Walk up from `startDir` to `/` and collect every `.env` found (child dirs before parents).
 * Reverse so we load repo root first and `apps/api/.env` last (override), matching `.env.example`.
 */
function dotenvPathsWalkingUp(startDir: string): string[] {
  const deepestFirst: string[] = [];
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) {
      deepestFirst.push(candidate);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return deepestFirst.slice().reverse();
}

function loadMonorepoDotenv() {
  const startDirs: string[] = [];
  const addStart = (d: string) => {
    const r = path.resolve(d);
    if (!startDirs.includes(r)) startDirs.push(r);
  };

  addStart(process.cwd());
  try {
    addStart(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    /* import.meta.url missing in some runtimes */
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const start of startDirs) {
    for (const file of dotenvPathsWalkingUp(start)) {
      const abs = path.resolve(file);
      if (seen.has(abs)) continue;
      seen.add(abs);
      ordered.push(abs);
    }
  }

  let loadedAny = false;
  for (const file of ordered) {
    loadEnvFile({ path: file, override: loadedAny });
    loadedAny = true;
  }
}

loadMonorepoDotenv();

function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

/** `prisma generate` does not connect; avoid `env()` here so install works without DATABASE_URL. */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
