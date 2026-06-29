import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type GeneratableFile = "module" | "controller" | "service" | "dto" | "entity" | "test";

export interface WiltConfig {
  modulesDir?: string;
  srcDir?: string;
  generate?: {
    files?: GeneratableFile[];
  };
}

export interface ResolvedWiltConfig {
  modulesDir: string;
  srcDir: string;
  generate: {
    files: GeneratableFile[];
  };
}

export async function loadConfig(cwd: string = process.cwd()): Promise<ResolvedWiltConfig> {
  let userConfig: WiltConfig = {};

  for (const name of ["wilt.config.ts", "wilt.config.js", "wilt.config.mjs"]) {
    const configPath = join(cwd, name);
    if (existsSync(configPath)) {
      try {
        const mod = await import(configPath);
        userConfig = mod.default ?? {};
      } catch {
        // .ts files require tsx; compiled binary falls back to defaults
      }
      break;
    }
  }

  return {
    modulesDir: resolve(cwd, userConfig.modulesDir ?? "src/modules/app"),
    srcDir: resolve(cwd, userConfig.srcDir ?? "src"),
    generate: {
      files: userConfig.generate?.files ?? ["module", "controller", "service", "dto", "entity", "test"],
    },
  };
}
