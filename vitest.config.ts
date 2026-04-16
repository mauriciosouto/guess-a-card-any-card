import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/web",
      "apps/api",
      {
        test: {
          name: "shared",
          environment: "node",
          include: ["packages/shared/**/*.test.ts"],
        },
      },
    ],
  },
});
