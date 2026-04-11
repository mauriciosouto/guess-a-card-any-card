import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Avoid naming this `__dirname` — bundlers (e.g. Netlify Functions) may merge scopes with Prisma/runtime. */
const apiPackageDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(apiPackageDir, "..");
const repoRoot = path.resolve(apiRoot, "../..");

/** Prefer apps/api/.env; fill missing vars from repo root .env (monorepo DX). */
config({ path: path.join(apiRoot, ".env") });
config({ path: path.join(repoRoot, ".env") });
