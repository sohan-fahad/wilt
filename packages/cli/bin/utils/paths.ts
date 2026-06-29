import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

/** Absolute path to the project root (where the CLI is invoked from) */
export const PROJECT_ROOT = process.cwd();

/** Absolute path to src/ */
export const SRC_DIR = join(PROJECT_ROOT, "src");

/** Absolute path to src/modules/ */
export const MODULES_DIR = join(SRC_DIR, "modules");

/** Absolute path to src/modules/app/ (default location for generated modules) */
export const APP_MODULES_DIR = join(MODULES_DIR, "app");

/** Absolute path to wrangler.jsonc */
export const WRANGLER_JSONC = join(PROJECT_ROOT, "wrangler.jsonc");

/** Absolute path to worker-configuration.d.ts */
export const WORKER_CONFIGURATION = join(PROJECT_ROOT, "worker-configuration.d.ts");

/** Absolute path to src/app.module.ts */
export const APP_MODULE_FILE = join(SRC_DIR, "app.module.ts");

/** Absolute path to src/database/schema.ts */
export const SCHEMA_FILE = join(SRC_DIR, "database", "schema.ts");

/** The @wilt/core import used in generated files */
export function coreImportPath(): string {
  return "@wilt/core";
}

/** Ensure a directory exists, creating it recursively if needed */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
