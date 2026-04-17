// Env vars come from Netlify UI / `netlify env` — no repo .env in serverless.
import { handle } from "hono/netlify";
import { app } from "../../src/server/http-app";

/** Netlify's Node bootstrap expects a `handler` named export (default alone can be dropped by the bundler). */
const handler = handle(app);
export { handler };
export default handler;

export const config = {
  path: "/api/*",
};
