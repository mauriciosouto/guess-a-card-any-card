// Env vars come from Netlify UI / `netlify env` — no repo .env in serverless.
import { handle } from "hono/netlify";
import { app } from "../../src/server/http-app";

export default handle(app);

export const config = {
  path: "/api/*",
};
