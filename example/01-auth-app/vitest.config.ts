import path from "path";
import { defineConfig } from "vitest/config";
import { cloudflarePool, cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  const poolOptions = {
    wrangler: { configPath: "./wrangler.jsonc" },
    miniflare: {
      bindings: { TEST_MIGRATIONS: JSON.stringify(migrations) },
    },
  };
  return {
    plugins: [cloudflareTest(poolOptions)],
    resolve: {
      alias: { "@app": path.resolve("./src") },
    },
    test: {
      pool: cloudflarePool(poolOptions),
    },
  };
});
