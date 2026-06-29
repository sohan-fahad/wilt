import { defineConfig } from "tsup";

export default defineConfig({
	entry: { "bin/wilt": "bin/wilt.ts" },
	format: ["esm"],
	dts: false,
	splitting: false,
	sourcemap: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
	esbuildOptions(options) {
		options.banner = { js: "#!/usr/bin/env node" };
	},
});
