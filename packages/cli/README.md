# @wilt/cli

The official CLI for the [Wilt framework](../core/README.md). Scaffold new Cloudflare Workers projects and generate modules, services, and controllers.

## Installation

```bash
npm install -g @wilt/cli
```

Or run without installing:

```bash
npx @wilt/cli new my-app
```

---

## Commands

### `wilt new <project-name>`

Scaffold a new Wilt project with a Hello module, D1 database setup, and all config files pre-configured.

```bash
wilt new my-app
cd my-app
pnpm dev   # http://localhost:4001
```

**What gets created:**

```
my-app/
├── src/
│   ├── index.ts
│   ├── app.module.ts
│   └── modules/app/hello/
│       ├── hello.module.ts
│       ├── hello.controller.ts
│       └── hello.service.ts
├── src/database/
│   ├── schema.ts
│   └── connection.ts
├── migrations/
├── wilt.config.ts
├── wrangler.jsonc
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

### `wilt generate <subcommand> <name>`

Aliases: `g`

Scaffold files inside an existing project. Reads `wilt.config.ts` for the modules directory.

#### `wilt generate module <name>` (alias: `g m`)

Generates a full module: module, controller, service, DTO, entity, and test file.

```bash
wilt generate module payment
wilt g m payment
wilt g m payment --no-test    # skip test file
wilt g m payment --path src/modules/billing/payment
```

**Output:**

```
src/modules/app/payment/
├── payment.module.ts
├── payment.controller.ts
├── payment.service.ts
├── payment.dto.ts
├── payment.entity.ts
└── payment.test.ts
```

#### `wilt generate service <name>` (alias: `g s`)

```bash
wilt generate service payment
wilt g s payment --path src/modules/app/payment
```

#### `wilt generate controller <name>` (alias: `g c`)

```bash
wilt generate controller payment
wilt g c payment --path src/modules/app/payment
```

---

### `wilt add <service> [args]`

Add a Cloudflare service binding to `wrangler.jsonc`.

| Subcommand | Usage | Example |
|---|---|---|
| `d1` | `wilt add d1 <BINDING> <db-name>` | `wilt add d1 DB my-database` |
| `r2` | `wilt add r2 <BINDING> <bucket-name>` | `wilt add r2 ASSETS my-bucket` |
| `kv` | `wilt add kv <BINDING>` | `wilt add kv SESSION_KV` |
| `queue` | `wilt add queue <BINDING> <queue-name>` | `wilt add queue MAIL mail-queue` |
| `ai` | `wilt add ai <BINDING>` | `wilt add ai AI` |
| `durable-object` | `wilt add durable-object <BINDING> <ClassName>` | `wilt add durable-object CHAT ChatRoom` |
| `vectorize` | `wilt add vectorize <BINDING> <index-name> [dims]` | `wilt add vectorize VEC my-index 1536` |
| `browser` | `wilt add browser <BINDING>` | `wilt add browser BROWSER` |
| `hyperdrive` | `wilt add hyperdrive <BINDING> <connection-string>` | `wilt add hyperdrive HD postgres://...` |

---

## Config (`wilt.config.ts`)

Place this file in your project root to customise the CLI behaviour.

```typescript
import { defineConfig } from "@wilt/core/config";

export default defineConfig({
  // Where generated modules are placed (relative to project root)
  modulesDir: "src/modules/app",

  // Which files are scaffolded by `wilt generate module <name>`
  // Remove "test" to skip test files, or pass --no-test per-command
  generate: {
    files: ["module", "controller", "service", "dto", "entity", "test"],
  },
});
```

---

## Usage Inside a Project

When `@wilt/cli` is installed locally as a dev dependency, add a script to `package.json`:

```json
{
  "scripts": {
    "wilt": "tsx node_modules/@wilt/cli/bin/wilt.ts"
  }
}
```

Then run:

```bash
pnpm wilt generate module posts
pnpm wilt add d1 DB my-database
```

---

## License

MIT
