// Env vars come from Netlify UI / `netlify env` — no repo .env in serverless.
//
// We use hono/aws-lambda (v1 Lambda event format) rather than hono/netlify (v2 Request format)
// because:
//  1. Netlify esbuild re-bundles our pre-built CJS and strips the `config.path` export,
//     so v2 path-based routing cannot be detected at build time.
//  2. Routing is handled via `_redirects`: /api/* → /.netlify/functions/gac-api (v1 style).
//  3. hono/aws-lambda correctly converts the Lambda event (httpMethod, path, headers, body)
//     into a proper Request before calling app.fetch().
import { handle } from "hono/aws-lambda";
import { app } from "../../src/server/http-app";

export const handler = handle(app);
