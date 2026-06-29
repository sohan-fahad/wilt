import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

function kebab(name: string) {
  return name
    .replace(/([A-Z])/g, "-$1")
    .replace(/^-/, "")
    .replace(/_/g, "-")
    .toLowerCase();
}

// ─── File templates ───────────────────────────────────────────────────────────

function packageJsonTemplate(name: string) {
  return JSON.stringify(
    {
      name: kebab(name),
      version: "0.0.1",
      private: true,
      type: "module",
      scripts: {
        dev: "vite dev --host --port 4001",
        "dev:cf": "wrangler dev --port 4001",
        build: "vite build",
        deploy: "vite build && wrangler deploy",
        "cf-typegen": "wrangler types --env-interface CloudflareBindings",
        test: "vitest --run",
        "test:watch": "vitest --watch",
        "db:gen": "drizzle-kit generate",
        "db:migrate": "wrangler d1 migrations apply DB --local",
        "db:migrate:remote": "wrangler d1 migrations apply DB --remote",
        check: "tsc --noEmit",
        wilt: "tsx node_modules/@wilt/cli/bin/wilt.ts",
      },
      dependencies: {
        hono: "^4.12.0",
        "@wilt/core": "^0.2.0",
        "reflect-metadata": "^0.2.2",
        zod: "^4.0.0",
        "drizzle-orm": "^0.45.0",
        ulid: "^3.0.0",
      },
      devDependencies: {
        "@wilt/cli": "^0.2.0",
        "@cloudflare/vite-plugin": "^1.36.0",
        "@cloudflare/workers-types": "^4.0.0",
        "@cloudflare/vitest-pool-workers": "^0.16.0",
        "@types/node": "^22.0.0",
        "drizzle-kit": "^0.31.0",
        typescript: "^6.0.0",
        vite: "^6.0.0",
        vitest: "^4.1.0",
        tsx: "^4.0.0",
        wrangler: "^4.0.0",
      },
    },
    null,
    2
  );
}

function wranglerTemplate(name: string) {
  return `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "${kebab(name)}",
  "main": "./src/index.ts",
  "compatibility_date": "2025-06-17",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "MODE": "development"
  },
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "REPLACE_WITH_YOUR_D1_NAME",
      "database_id": "00000000-0000-0000-0000-000000000001",
      "migrations_dir": "migrations",
      "preview_database_id": "00000000-0000-0000-0000-000000000002"
    }
  ],
  "dev": { "port": 4001 }
}
`;
}

function tsconfigTemplate() {
  return `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "ignoreDeprecations": "6.0",
    "lib": ["ESNext", "DOM"],
    "types": ["vite/client", "@cloudflare/workers-types"],
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist"]
}
`;
}

function viteConfigTemplate() {
  return `import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [cloudflare()],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
`;
}

function workerTypesTemplate() {
  return `// Managed by \`wilt add\` and \`pnpm cf-typegen\`.
// Run \`pnpm wilt add kv|r2|d1|ai|...\` to add a binding — types update automatically.
// Run \`pnpm cf-typegen\` to regenerate from wrangler.jsonc at any time.
/// <reference types="@cloudflare/vitest-pool-workers/types" />
interface CloudflareBindings {
  DB: D1Database;
  MODE: string;
}

declare namespace Cloudflare {
  interface Env extends CloudflareBindings {
    TEST_MIGRATIONS: string;
  }
}
`;
}

function vitestConfigTemplate() {
  return `import path from "path";
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
`;
}

function indexTemplate() {
  return `import "reflect-metadata";
import { app } from "./app.module";

export default {
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
`;
}

function appModuleTemplate() {
  return `import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { Module, createModule } from "@wilt/core";
import { requestLogger } from "@wilt/core/middleware";
import { HelloModule } from "./modules/app/hello/hello.module";

@Module({
  imports: [HelloModule],
})
export class AppModule {}

const app = createModule(AppModule, {
  middlewares: [cors(), secureHeaders(), requestLogger],
});

app.get("/", (c) => c.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));
app.get("/health", (c) => c.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));

export { app };
`;
}

function helloModuleTemplate() {
  return `import { Module } from "@wilt/core";
import { HelloController } from "./hello.controller";
import { HelloService } from "./hello.service";

@Module({
  controllers: [HelloController],
  providers: [HelloService],
})
export class HelloModule {}
`;
}

function helloControllerTemplate() {
  return `import type { Ctx } from "@app/context";
import { Controller, Get, Inject } from "@wilt/core";
import { ResponseUtil } from "@wilt/core";
import { HelloService } from "./hello.service";

@Controller("/hello")
export class HelloController {
  constructor(@Inject(HelloService) private helloService: HelloService) {}

  @Get()
  async greet(c: Ctx) {
    const message = this.helloService.greet();
    return ResponseUtil.success(c, { message });
  }
}
`;
}

function helloServiceTemplate() {
  return `import { Injectable } from "@wilt/core";

@Injectable()
export class HelloService {
  greet() {
    return "Hello from Wilt!";
  }
}
`;
}

function dbSchemaTemplate() {
  return `// Register all your entity tables here so Drizzle can build relations and
// drizzle-kit can generate migrations from a single source of truth.
export const schema = {};
`;
}

function appContextTemplate() {
  return `import type { AppContext } from "@wilt/core";

declare module "@wilt/core" {
  interface WiltBindings extends CloudflareBindings {}
}

export type Ctx = AppContext;
`;
}

function dbConnectionTemplate() {
  return `import { drizzle } from "drizzle-orm/d1";
import type { Ctx } from "@app/context";
import { schema } from "./schema";
export function getDb(c: Ctx) {
  return drizzle(c.env.DB, { schema: schema });
}
`;
}

function gitignoreTemplate() {
  return `dist/
node_modules/
.wrangler
.env
.env.production
.dev.vars
.DS_Store
coverage/
*.log
`;
}

function pnpmWorkspaceTemplate() {
  return `# This file makes pnpm treat this project as its own workspace root,
# preventing it from resolving packages against a parent workspace.
packages: []
`;
}


function wiltConfigTemplate() {
  return `import { defineConfig } from "@wilt/core/config";

export default defineConfig({
  // Directory where generated modules are placed (relative to project root)
  modulesDir: "src/modules/app",

  // Default files scaffolded by \`wilt generate module <name>\`
  // Remove "test" to skip test files, or pass --no-test at the CLI
  generate: {
    files: ["module", "controller", "service", "dto", "entity", "test"],
  },
});
`;
}

function envExampleTemplate() {
  return `CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_TOKEN=

CLOUDFLARE_DATABASE_ID=
`;
}

function drizzleConfigTemplate() {
  return `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_TOKEN!,
  },
  verbose: true,
  strict: true,
});
`;
}

function migrationTemplate() {
  return `-- Initial migration
-- Add your tables here
`;
}

function migrationMetaTemplate() {
  return JSON.stringify(
    {
      version: "5",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "5",
          when: Date.now(),
          tag: "0000_initial",
          breakpoints: true,
        },
      ],
    },
    null,
    2
  );
}

// ─── Scaffold ─────────────────────────────────────────────────────────────────

function write(path: string, content: string) {
  writeFileSync(path, content, "utf-8");
  console.log(`  ✔ ${path.replace(process.cwd() + "/", "")}`);
}

function dir(path: string) {
  mkdirSync(path, { recursive: true });
}

export function runNew(args: string[]): void {
  const [name] = args;

  if (!name) {
    console.error("  ✗ Usage: wilt new <project-name>");
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), name);

  if (existsSync(projectDir)) {
    console.error(`  ✗ Directory already exists: ${projectDir}`);
    process.exit(1);
  }

  console.log(`\n  Creating Wilt app "${name}"...\n`);

  // Directories
  dir(join(projectDir, "src/modules/app/hello"));
  dir(join(projectDir, "src/database"));
  dir(join(projectDir, "migrations/meta"));

  // Config files
  write(join(projectDir, "package.json"), packageJsonTemplate(name));
  write(join(projectDir, "wrangler.jsonc"), wranglerTemplate(name));
  write(join(projectDir, "tsconfig.json"), tsconfigTemplate());
  write(join(projectDir, "vite.config.ts"), viteConfigTemplate());
  write(join(projectDir, "vitest.config.ts"), vitestConfigTemplate());
  write(join(projectDir, "worker-configuration.d.ts"), workerTypesTemplate());
  write(join(projectDir, "wilt.config.ts"), wiltConfigTemplate());
  write(join(projectDir, "pnpm-workspace.yaml"), pnpmWorkspaceTemplate());
  write(join(projectDir, ".gitignore"), gitignoreTemplate());
  write(join(projectDir, ".env.example"), envExampleTemplate());
  write(join(projectDir, "drizzle.config.ts"), drizzleConfigTemplate());

  // App entry
  write(join(projectDir, "src/index.ts"), indexTemplate());
  write(join(projectDir, "src/app.module.ts"), appModuleTemplate());
  write(join(projectDir, "src/context.ts"), appContextTemplate());

  // Hello module
  write(join(projectDir, "src/modules/app/hello/hello.module.ts"), helloModuleTemplate());
  write(join(projectDir, "src/modules/app/hello/hello.controller.ts"), helloControllerTemplate());
  write(join(projectDir, "src/modules/app/hello/hello.service.ts"), helloServiceTemplate());

  // Database
  write(join(projectDir, "src/database/schema.ts"), dbSchemaTemplate());
  write(join(projectDir, "src/database/connection.ts"), dbConnectionTemplate());

  // Migrations
  write(join(projectDir, "migrations/0000_initial.sql"), migrationTemplate());
  write(join(projectDir, "migrations/meta/_journal.json"), migrationMetaTemplate());

  // Try to install dependencies
  console.log("\n  Installing dependencies...\n");
  try {
    const pm = detectPackageManager();
    execSync(`${pm} install`, { cwd: projectDir, stdio: "inherit" });
  } catch {
    console.log("  ⚠ Could not auto-install. Run `pnpm install` manually.\n");
  }

  console.log(`
  ✔ Project created!

  Next steps:
    cd ${name}
    cp .env.example .env                   # fill in Cloudflare credentials
    # Edit wrangler.jsonc: set database_name + database_id
    pnpm db:migrate                        # apply local D1 migrations
    pnpm dev                               # http://localhost:4001

  Try it:
    curl http://localhost:4001/health
    curl http://localhost:4001/hello

  Generate a new module:
    pnpm wilt generate module posts
`);
}

function detectPackageManager(): string {
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return "pnpm";
  } catch { }
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch { }
  return "npm";
}
