import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { WRANGLER_JSONC, WORKER_CONFIGURATION } from "./paths.js";

type WranglerConfig = Record<string, any>;

/** Strip `//` line comments from a JSONC string so JSON.parse can handle it. */
function stripComments(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .join("\n");
}

export function readWrangler(): WranglerConfig {
  const raw = readFileSync(WRANGLER_JSONC, "utf-8");
  return JSON.parse(stripComments(raw));
}

export function writeWrangler(config: WranglerConfig): void {
  const header = `{\n  "$schema": "node_modules/wrangler/config-schema.json",`;
  const body = JSON.stringify(config, null, 2);

  // Remove opening brace and $schema from body (we add them above with the comment header)
  const bodyWithoutSchema = body
    .replace(/^\{/, "")
    .replace(/\s+"?\$schema"?\s*:\s*"[^"]*",?\n/, "\n");

  writeFileSync(WRANGLER_JSONC, header + bodyWithoutSchema, "utf-8");
}

// ─── Type sync ───────────────────────────────────────────────────────────────

const WORKER_TYPES_HEADER = `\
// Managed by \`wilt add\` and \`pnpm cf-typegen\`.
// Run \`pnpm wilt add kv|r2|d1|ai|...\` to add a binding — types update automatically.
// Run \`pnpm cf-typegen\` to regenerate from wrangler.jsonc at any time.
/// <reference types="@cloudflare/vitest-pool-workers/types" />`;

const WORKER_TYPES_FOOTER = `\
declare namespace Cloudflare {
  interface Env extends CloudflareBindings {
    TEST_MIGRATIONS: string;
  }
}`;

function extractBindings(config: WranglerConfig): Array<{ name: string; type: string }> {
  const out: Array<{ name: string; type: string }> = [];

  for (const key of Object.keys(config.vars ?? {})) {
    out.push({ name: key, type: "string" });
  }
  for (const db of config.d1_databases ?? []) {
    out.push({ name: db.binding, type: "D1Database" });
  }
  for (const b of config.r2_buckets ?? []) {
    out.push({ name: b.binding, type: "R2Bucket" });
  }
  for (const kv of config.kv_namespaces ?? []) {
    out.push({ name: kv.binding, type: "KVNamespace" });
  }
  for (const q of config.queues?.producers ?? []) {
    out.push({ name: q.binding, type: "Queue" });
  }
  if (config.ai?.binding) {
    out.push({ name: config.ai.binding, type: "Ai" });
  }
  for (const d of config.durable_objects?.bindings ?? []) {
    out.push({ name: d.name, type: "DurableObjectNamespace" });
  }
  for (const v of config.vectorize ?? []) {
    out.push({ name: v.binding, type: "VectorizeIndex" });
  }
  if (config.browser?.binding) {
    out.push({ name: config.browser.binding, type: "Fetcher" });
  }
  for (const h of config.hyperdrive ?? []) {
    out.push({ name: h.binding, type: "Hyperdrive" });
  }

  return out;
}

/**
 * Reads all bindings from wrangler.jsonc and rewrites the CloudflareBindings
 * interface in worker-configuration.d.ts. Useful for existing projects.
 */
export function syncWorkerTypes(): void {
  if (!existsSync(WRANGLER_JSONC)) {
    console.error("  ✗ wrangler.jsonc not found — run from your project root.");
    process.exit(1);
  }

  const config = readWrangler();
  const bindings = extractBindings(config);
  const lines = bindings.map((b) => `  ${b.name}: ${b.type};`).join("\n");
  const interfaceBlock = `interface CloudflareBindings {\n${lines}\n}`;

  let updated: string;

  if (existsSync(WORKER_CONFIGURATION)) {
    const content = readFileSync(WORKER_CONFIGURATION, "utf-8");
    if (content.includes("interface CloudflareBindings")) {
      updated = content.replace(/interface CloudflareBindings \{[^}]*\}/, interfaceBlock);
    } else {
      updated = `${WORKER_TYPES_HEADER}\n${interfaceBlock}\n\n${WORKER_TYPES_FOOTER}\n`;
    }
  } else {
    updated = `${WORKER_TYPES_HEADER}\n${interfaceBlock}\n\n${WORKER_TYPES_FOOTER}\n`;
  }

  writeFileSync(WORKER_CONFIGURATION, updated, "utf-8");
  console.log(`  ✔ worker-configuration.d.ts synced — ${bindings.length} binding${bindings.length !== 1 ? "s" : ""}`);
  for (const b of bindings) {
    console.log(`      ${b.name}: ${b.type}`);
  }
}

/**
 * Adds a `binding: TsType;` line to the CloudflareBindings interface in
 * worker-configuration.d.ts so that `c.env.BINDING` is immediately typed.
 */
export function updateWorkerTypes(binding: string, tsType: string): void {
  if (!existsSync(WORKER_CONFIGURATION)) {
    console.log(
      `  ! worker-configuration.d.ts not found — run \`pnpm cf-typegen\` after setup.`
    );
    return;
  }

  const content = readFileSync(WORKER_CONFIGURATION, "utf-8");

  if (new RegExp(`\\b${binding}\\s*:`).test(content)) {
    return;
  }

  const updated = content.replace(
    /(interface CloudflareBindings \{[^}]*)(})/,
    `$1  ${binding}: ${tsType};\n$2`
  );

  if (updated === content) {
    console.log(
      `  ! Could not locate CloudflareBindings in worker-configuration.d.ts — run \`pnpm cf-typegen\`.`
    );
    return;
  }

  writeFileSync(WORKER_CONFIGURATION, updated, "utf-8");
  console.log(
    `  ✔ worker-configuration.d.ts — added ${binding}: ${tsType}`
  );
}

// ─── Binding mutators ────────────────────────────────────────────────────────

export function addD1(binding: string, databaseName: string): void {
  const config = readWrangler();
  if (!config.d1_databases) config.d1_databases = [];

  const alreadyExists = config.d1_databases.some(
    (db: any) => db.binding === binding
  );
  if (alreadyExists) {
    console.error(`  ✗ D1 binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.d1_databases.push({
    binding,
    database_name: databaseName,
    database_id: "00000000-0000-0000-0000-000000000000",
    migrations_dir: "migrations",
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "D1Database");
  console.log(`  ✔ Added D1 binding "${binding}" (database: ${databaseName})`);
  console.log(`  ! Remember to replace database_id with your actual D1 database ID.`);
}

export function addR2(binding: string, bucketName: string): void {
  const config = readWrangler();
  if (!config.r2_buckets) config.r2_buckets = [];

  if (config.r2_buckets.some((b: any) => b.binding === binding)) {
    console.error(`  ✗ R2 binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.r2_buckets.push({
    binding,
    bucket_name: bucketName,
    preview_bucket_name: `${bucketName}-preview`,
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "R2Bucket");
  console.log(`  ✔ Added R2 binding "${binding}" (bucket: ${bucketName})`);
}

export function addKv(binding: string): void {
  const config = readWrangler();
  if (!config.kv_namespaces) config.kv_namespaces = [];

  if (config.kv_namespaces.some((k: any) => k.binding === binding)) {
    console.error(`  ✗ KV binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.kv_namespaces.push({
    binding,
    id: "00000000000000000000000000000000",
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "KVNamespace");
  console.log(`  ✔ Added KV namespace binding "${binding}"`);
  console.log(`  ! Remember to replace id with your actual KV namespace ID.`);
}

export function addQueue(binding: string, queueName: string): void {
  const config = readWrangler();
  if (!config.queues) config.queues = { producers: [], consumers: [] };
  if (!config.queues.producers) config.queues.producers = [];
  if (!config.queues.consumers) config.queues.consumers = [];

  if (config.queues.producers.some((p: any) => p.binding === binding)) {
    console.error(`  ✗ Queue producer binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.queues.producers.push({ binding, queue: queueName });
  config.queues.consumers.push({
    queue: queueName,
    max_batch_size: 10,
    max_batch_timeout: 10,
    max_retries: 3,
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "Queue");
  console.log(`  ✔ Added Queue binding "${binding}" (queue: ${queueName})`);
}

export function addAi(binding: string): void {
  const config = readWrangler();

  if (config.ai) {
    console.error(`  ✗ AI binding already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.ai = { binding };
  writeWrangler(config);
  updateWorkerTypes(binding, "Ai");
  console.log(`  ✔ Added AI binding "${binding}"`);
}

export function addDurableObject(binding: string, className: string): void {
  const config = readWrangler();
  if (!config.durable_objects) config.durable_objects = { bindings: [] };
  if (!config.durable_objects.bindings) config.durable_objects.bindings = [];

  if (config.durable_objects.bindings.some((b: any) => b.name === binding)) {
    console.error(`  ✗ Durable Object binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.durable_objects.bindings.push({
    name: binding,
    class_name: className,
  });

  // Also add a migration entry
  if (!config.migrations) config.migrations = [];
  const existingClasses: string[] = config.migrations.flatMap(
    (m: any) => m.new_sqlite_classes ?? m.new_classes ?? []
  );
  if (!existingClasses.includes(className)) {
    const nextTag = `v${config.migrations.length + 1}`;
    config.migrations.push({
      tag: nextTag,
      new_sqlite_classes: [className],
    });
    console.log(`  ! Added migration entry "${nextTag}" for ${className}.`);
  }

  writeWrangler(config);
  updateWorkerTypes(binding, "DurableObjectNamespace");
  console.log(`  ✔ Added Durable Object binding "${binding}" (class: ${className})`);
}

export function addVectorize(binding: string, indexName: string, dimensions: number = 1536): void {
  const config = readWrangler();
  if (!config.vectorize) config.vectorize = [];

  if (config.vectorize.some((v: any) => v.binding === binding)) {
    console.error(`  ✗ Vectorize binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.vectorize.push({
    binding,
    index_name: indexName,
    dimensions,
    metric: "cosine",
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "VectorizeIndex");
  console.log(`  ✔ Added Vectorize binding "${binding}" (index: ${indexName}, dimensions: ${dimensions})`);
  console.log(`  ! Create the index with: wrangler vectorize create ${indexName} --dimensions=${dimensions} --metric=cosine`);
}

export function addBrowser(binding: string): void {
  const config = readWrangler();

  if (config.browser) {
    console.error(`  ✗ Browser binding already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.browser = { binding };
  writeWrangler(config);
  updateWorkerTypes(binding, "Fetcher");
  console.log(`  ✔ Added Browser rendering binding "${binding}"`);
}

export function addVar(name: string, value: string = ""): void {
  const config = readWrangler();
  if (!config.vars) config.vars = {};

  if (Object.prototype.hasOwnProperty.call(config.vars, name)) {
    console.error(`  ✗ Var "${name}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.vars[name] = value;
  writeWrangler(config);
  updateWorkerTypes(name, "string");
  console.log(`  ✔ Added var "${name}" to wrangler.jsonc`);
  if (!value) console.log(`  ! Set a value for "${name}" in wrangler.jsonc or .dev.vars`);
}

export function addHyperdrive(binding: string, connectionString: string): void {
  const config = readWrangler();
  if (!config.hyperdrive) config.hyperdrive = [];

  if (config.hyperdrive.some((h: any) => h.binding === binding)) {
    console.error(`  ✗ Hyperdrive binding "${binding}" already exists in wrangler.jsonc`);
    process.exit(1);
  }

  config.hyperdrive.push({
    binding,
    id: "00000000000000000000000000000000",
    localConnectionString: connectionString,
  });

  writeWrangler(config);
  updateWorkerTypes(binding, "Hyperdrive");
  console.log(`  ✔ Added Hyperdrive binding "${binding}"`);
  console.log(`  ! Remember to replace id with your actual Hyperdrive config ID.`);
}
