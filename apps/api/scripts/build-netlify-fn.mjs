/**
 * Pre-bundles the Netlify function as CJS with an import.meta.url polyfill.
 *
 * Problem: Netlify's esbuild always outputs CJS regardless of the input format.
 * In CJS, import.meta is `{}` so import.meta.url is `undefined`, which causes
 * Prisma's generated client to crash at load time:
 *   globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))
 *
 * Fix: pre-bundle ourselves with --define:import.meta.url=<cjs-equivalent>.
 * After the define, no `import.meta.url` survives in the source, so Netlify's
 * re-bundle pass sees only valid CJS and the crash disappears.
 *
 * Run from apps/api: node scripts/build-netlify-fn.mjs
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("netlify/dist", { recursive: true });

await build({
  entryPoints: ["netlify/functions/gac-api.mts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  // Keep heavy runtime deps external; Netlify installs them alongside the function.
  external: ["@prisma/client", "@prisma/adapter-pg", "pg", "ws"],
  tsconfig: "tsconfig.json",
  // esbuild define only accepts literals or identifiers, not expressions.
  // Workaround: inject a banner that declares the polyfill variable, then reference
  // it via define. The banner runs before any module code in the CJS bundle.
  banner: {
    js: "var __cjs_import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    "import.meta.url": "__cjs_import_meta_url",
  },
  outfile: "netlify/dist/gac-api.js",
  // Suppress the "import.meta.url" warning since we are intentionally handling it.
  logLevel: "warning",
});

console.log("✓ Netlify function bundled (CJS + import.meta.url polyfill applied)");
