import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"middleware/index": "src/middleware/index.ts",
		config: "src/config.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	splitting: true,
	sourcemap: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
	external: ["hono", "reflect-metadata", "zod"],
});
