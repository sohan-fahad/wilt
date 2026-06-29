import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { APP_MODULES_DIR, APP_MODULE_FILE, SCHEMA_FILE, coreImportPath, ensureDir } from "../utils/paths.js";

function toPascalCase(name: string): string {
  return name
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(name: string): string {
  return name
    .replace(/([A-Z])/g, "-$1")
    .replace(/^-/, "")
    .replace(/_/g, "-")
    .toLowerCase();
}

function pluralize(name: string): string {
  return name.endsWith("s") ? name : name + "s";
}

function moduleTemplate(name: string, corePath: string): string {
  const pascal = toPascalCase(name);
  const kebab = toKebabCase(name);

  return `import { Module } from "${corePath}";
import { ${pascal}Controller } from "./${kebab}.controller";
import { ${pascal}Service } from "./${kebab}.service";

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
  exports: [${pascal}Service],
})
export class ${pascal}Module {}
`;
}

function entityTemplate(name: string): string {
  const camel = toCamelCase(name);
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const entityVar = pluralize(camel);
  const tableName = pluralize(kebab);

  return `import { sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const ${entityVar} = sqliteTable("${tableName}", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type ${pascal} = typeof ${entityVar}.$inferSelect;
export type New${pascal} = typeof ${entityVar}.$inferInsert;
`;
}

function controllerTemplate(name: string, corePath: string): string {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const kebab = toKebabCase(name);
  return `import type { Context } from "hono";
import { Controller, Get, Inject } from "${corePath}";
import { ResponseUtil } from "${corePath}";
import { ${pascal}Service } from "./${kebab}.service";

@Controller("/${kebab}")
export class ${pascal}Controller {
  constructor(@Inject(${pascal}Service) private ${camel}Service: ${pascal}Service) {}

  @Get()
  async getAll(c: Context) {
    const data = await this.${camel}Service.findAll();
    return ResponseUtil.success(c, data);
  }
}
`;
}

function serviceTemplate(name: string, corePath: string): string {
  const pascal = toPascalCase(name);
  return `import { Injectable } from "${corePath}";

@Injectable()
export class ${pascal}Service {
  async findAll() {
    return [];
  }
}
`;
}

function testTemplate(name: string): string {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const table = pluralize(kebab.replace(/-/g, "_"));
  return `import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { SELF, env, applyD1Migrations } from "cloudflare:test";
import { ${pascal}Service } from "./${kebab}.service";

const BASE = "http://localhost";
const service = new ${pascal}Service();

beforeAll(async () => {
  await applyD1Migrations(env.DB, JSON.parse(env.TEST_MIGRATIONS));
});

afterEach(async () => {
  await env.DB.prepare("DELETE FROM ${table}").run();
});

describe("${pascal}Service", () => {
  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

describe("GET /${kebab}", () => {
  it("returns an empty list", async () => {
    const res = await SELF.fetch(\`\${BASE}/${kebab}\`);
    expect(res.status).toBe(200);
    const { data } = await res.json() as { data: unknown[] };
    expect(data).toEqual([]);
  });
});
`;
}

function dtoTemplate(name: string): string {
  const pascal = toPascalCase(name);
  return `import { z } from "zod";

export const Create${pascal}Dto = z.object({
  // TODO: define your fields
});

export const Update${pascal}Dto = Create${pascal}Dto.partial();

export type Create${pascal}DtoType = z.infer<typeof Create${pascal}Dto>;
export type Update${pascal}DtoType = z.infer<typeof Update${pascal}Dto>;
`;
}

function registerInAppModule(appModulePath: string, pascal: string, kebab: string, moduleDir: string): void {
  if (!existsSync(appModulePath)) {
    console.log(`  ⚠  app.module.ts not found — skipping auto-registration`);
    return;
  }

  let content = readFileSync(appModulePath, "utf-8");
  if (content.includes(`${pascal}Module`)) return;

  const rel = relative(dirname(appModulePath), moduleDir).replace(/\\/g, "/");
  const importPath = rel.startsWith(".") ? rel : "./" + rel;
  const importLine = `import { ${pascal}Module } from "${importPath}/${kebab}.module";`;

  const lines = content.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportIdx = i;
  }
  lines.splice(lastImportIdx + 1, 0, importLine);
  content = lines.join("\n");

  content = content.replace(
    /(\bimports\s*:\s*\[)([^\]]*)\]/,
    (_, prefix, existing) => {
      const trimmed = existing.trim();
      return `${prefix}${trimmed ? trimmed + ", " : ""}${pascal}Module]`;
    }
  );

  writeFileSync(appModulePath, content, "utf-8");
  console.log(`  ✔  Registered ${pascal}Module in app.module.ts`);
}

function registerInSchema(schemaPath: string, entityVar: string, kebab: string, moduleDir: string): void {
  if (!existsSync(schemaPath)) {
    console.log(`  ⚠  schema.ts not found — skipping entity registration`);
    return;
  }

  let content = readFileSync(schemaPath, "utf-8");
  if (content.includes(entityVar)) return;

  const rel = relative(dirname(schemaPath), join(moduleDir, `${kebab}.entity`)).replace(/\\/g, "/");
  const importPath = rel.startsWith(".") ? rel : "./" + rel;
  const importLine = `import { ${entityVar} } from "${importPath}";`;

  const lines = content.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine, "");
  }
  content = lines.join("\n");

  content = content.replace(
    /(export const schema\s*=\s*\{)([^}]*)\}/,
    (_, prefix, existing) => {
      const trimmed = existing.trim();
      return trimmed
        ? `${prefix} ${trimmed}, ${entityVar} }`
        : `${prefix} ${entityVar} }`;
    }
  );

  writeFileSync(schemaPath, content, "utf-8");
  console.log(`  ✔  Registered ${entityVar} in schema.ts`);
}

export type GeneratableFile = "module" | "controller" | "service" | "dto" | "entity" | "test";

export interface GenerateModuleOptions {
  /** Override output directory — defaults to config.modulesDir/<name>/ */
  dir?: string;
  /** Which files to generate — defaults to config.generate.files */
  files?: GeneratableFile[];
  /** Base directory for generated modules (from wilt.config.ts) */
  modulesDir?: string;
  /** Default file list (from wilt.config.ts) */
  defaultFiles?: GeneratableFile[];
  /** Skip generating the test file even if it is in defaultFiles */
  noTest?: boolean;
  /** Absolute path to src/ — used to locate app.module.ts and schema.ts */
  srcDir?: string;
}

export function generateModule(name: string, options: GenerateModuleOptions = {}): void {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const basedir = options.modulesDir ?? APP_MODULES_DIR;
  const moduleDir = options.dir ?? join(basedir, kebab);
  let filesToGen = options.files ?? options.defaultFiles ?? ["module", "controller", "service", "dto", "entity", "test"];
  if (options.noTest) filesToGen = filesToGen.filter((f) => f !== "test");

  if (existsSync(moduleDir)) {
    console.error(`  ✗ Directory already exists: ${moduleDir}`);
    process.exit(1);
  }

  ensureDir(moduleDir);

  const corePath = coreImportPath();
  const hasEntity = filesToGen.includes("entity");

  const fileMap: Record<string, string> = {
    module: moduleTemplate(name, corePath),
    controller: controllerTemplate(name, corePath),
    service: serviceTemplate(name, corePath),
    dto: dtoTemplate(name),
    entity: entityTemplate(name),
    test: testTemplate(name),
  };

  const extMap: Record<string, string> = {
    module: `${kebab}.module.ts`,
    controller: `${kebab}.controller.ts`,
    service: `${kebab}.service.ts`,
    dto: `${kebab}.dto.ts`,
    entity: `${kebab}.entity.ts`,
    test: `${kebab}.test.ts`,
  };

  for (const file of filesToGen) {
    const filePath = join(moduleDir, extMap[file]);
    writeFileSync(filePath, fileMap[file], "utf-8");
    console.log(`  ✔ Created ${filePath.replace(process.cwd() + "/", "")}`);
  }

  const appModulePath = options.srcDir ? join(options.srcDir, "app.module.ts") : APP_MODULE_FILE;
  const schemaPath = options.srcDir ? join(options.srcDir, "database", "schema.ts") : SCHEMA_FILE;

  registerInAppModule(appModulePath, pascal, kebab, moduleDir);
  if (hasEntity) {
    registerInSchema(schemaPath, pluralize(toCamelCase(name)), kebab, moduleDir);
    console.log(`\n  Run \`pnpm db:gen\` to generate a migration.\n`);
  }
}

export function generateService(name: string, dir?: string, modulesDir?: string): void {
  const kebab = toKebabCase(name);
  const basedir = modulesDir ?? APP_MODULES_DIR;
  const targetDir = dir ?? join(basedir, kebab);
  const corePath = coreImportPath();
  const filePath = join(targetDir, `${kebab}.service.ts`);

  if (existsSync(filePath)) {
    console.error(`  ✗ File already exists: ${filePath}`);
    process.exit(1);
  }

  ensureDir(targetDir);
  writeFileSync(filePath, serviceTemplate(name, corePath), "utf-8");
  console.log(`  ✔ Created ${filePath.replace(process.cwd() + "/", "")}`);
}

export function generateController(name: string, dir?: string, modulesDir?: string): void {
  const kebab = toKebabCase(name);
  const basedir = modulesDir ?? APP_MODULES_DIR;
  const targetDir = dir ?? join(basedir, kebab);
  const corePath = coreImportPath();
  const filePath = join(targetDir, `${kebab}.controller.ts`);

  if (existsSync(filePath)) {
    console.error(`  ✗ File already exists: ${filePath}`);
    process.exit(1);
  }

  ensureDir(targetDir);
  writeFileSync(filePath, controllerTemplate(name, corePath), "utf-8");
  console.log(`  ✔ Created ${filePath.replace(process.cwd() + "/", "")}`);
}
