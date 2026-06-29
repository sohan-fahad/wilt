import { defineConfig } from "@wilt/core/config";

export default defineConfig({
  // Directory where generated modules are placed (relative to project root)
  modulesDir: "src/modules/app",

  // Default files scaffolded by `wilt generate module <name>`
  // Remove "test" to skip test files, or pass --no-test at the CLI
  generate: {
    files: ["module", "controller", "service", "dto", "entity", "test"],
  },
});
