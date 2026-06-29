import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runNew } from "./commands/new.js";
import { runGenerate } from "./commands/generate.js";
import { runAdd } from "./commands/add.js";
import { syncWorkerTypes } from "./utils/wrangler.js";

function getVersion(): string {
  // Works from both bin/wilt.ts (dev) and dist/bin/wilt.js (prod)
  const candidates = [
    new URL("../package.json", import.meta.url),
    new URL("../../package.json", import.meta.url),
  ];
  for (const url of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(fileURLToPath(url), "utf-8"));
      if (pkg.version) return pkg.version as string;
    } catch {}
  }
  return "unknown";
}

const BANNER = `
 ██╗    ██╗██╗██╗      ████████╗
 ██║    ██║██║██║      ╚══██╔══╝
 ██║ █╗ ██║██║██║         ██║
 ██║███╗██║██║██║         ██║
 ╚███╔███╔╝██║███████╗    ██║
  ╚══╝╚══╝ ╚═╝╚══════╝   ╚═╝
  Wilt CLI — Cloudflare Workers & Hono Framework
`.trim();

const HELP = `
${BANNER}

Usage:
  pnpm wilt <command> [subcommand] [args...]

Commands:
  new             Create a new Wilt project
  generate (g)    Scaffold module, service, or controller files
  add             Add a Cloudflare binding to wrangler.jsonc + update types
  sync            Sync worker-configuration.d.ts from existing wrangler.jsonc
  help            Show this help message

Generate subcommands:
  module (m)      Scaffold a full module (module + controller + service + dto)
  service (s)     Scaffold a service file
  controller (c)  Scaffold a controller file

Add subcommands:
  var             Env var (wrangler.jsonc vars + type)
  d1              D1 database binding
  r2              R2 bucket binding
  kv              KV namespace binding
  queue           Queue producer + consumer
  ai              Workers AI binding
  durable-object  Durable Object binding + migration
  vectorize       Vectorize index binding
  browser         Browser rendering binding
  hyperdrive      Hyperdrive binding

Examples:
  pnpm wilt new my-app
  pnpm wilt generate module payment
  pnpm wilt g m payment
  pnpm wilt add d1 PAYMENTS_DB payments-db
  pnpm wilt add r2 ASSETS_BUCKET my-assets
  pnpm wilt add kv SESSION_KV
  pnpm wilt add queue MAIL_QUEUE mailer
  pnpm wilt add ai AI
  pnpm wilt add durable-object CHAT_ROOM ChatRoom
  pnpm wilt sync
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (command === "--version" || command === "-v") {
    console.log(getVersion());
    process.exit(0);
  }

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(`\n${HELP}\n`);
    process.exit(0);
  }

  const cmd = command.toLowerCase();

  if (cmd === "new" || cmd === "n") {
    runNew(rest);
  } else if (cmd === "generate" || cmd === "g") {
    await runGenerate(rest);
  } else if (cmd === "add") {
    runAdd(rest);
  } else if (cmd === "sync") {
    console.log(`\n  Syncing worker-configuration.d.ts from wrangler.jsonc...\n`);
    syncWorkerTypes();
    console.log();
  } else {
    console.error(`  ✗ Unknown command: "${command}"\n`);
    console.log(HELP);
    process.exit(1);
  }
}

main();
