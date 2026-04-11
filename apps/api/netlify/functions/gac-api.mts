import "../../src/load-env";
import { handle } from "hono/netlify";
import { app } from "../../src/server/http-app";

export default handle(app);

export const config = {
  path: "/api/*",
};
