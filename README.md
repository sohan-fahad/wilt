# Wilt

A NestJS-like framework for **Cloudflare Workers** built on [Hono](https://hono.dev). Write modular, decorator-driven APIs that deploy to the edge — no server required.

```bash
npx @wilt/cli new my-app
```

---

## Packages

| Package | Description | Version |
|---|---|---|
| [`@wilt/core`](./packages/core/README.md) | Framework — decorators, DI, middleware, pipes, exceptions | [![npm](https://img.shields.io/npm/v/@wilt/core)](https://www.npmjs.com/package/@wilt/core) |
| [`@wilt/cli`](./packages/cli/README.md) | CLI — `wilt new`, `wilt generate`, `wilt add` | [![npm](https://img.shields.io/npm/v/@wilt/cli)](https://www.npmjs.com/package/@wilt/cli) |

---

## Quick Start

```bash
npx @wilt/cli new my-app
cd my-app
pnpm db:migrate   # apply local D1 migrations
pnpm dev          # http://localhost:4001
```

```bash
curl http://localhost:4001/health
curl http://localhost:4001/hello
```

---

## Monorepo Structure

```
packages/
├── core/     → @wilt/core  (framework source)
└── cli/      → @wilt/cli   (CLI source)
example/
└── ajke-test/              (reference app)
```

### Development

```bash
pnpm install          # install all workspace deps
pnpm build            # build both packages
pnpm build:core       # build @wilt/core only
pnpm build:cli        # build @wilt/cli only
pnpm check            # TypeScript check across all packages
```

---

## Publishing

### Prerequisites

1. **Create an npm account** at [npmjs.com](https://www.npmjs.com) if you don't have one.

2. **Create the `wilt` npm organization** at [npmjs.com/org/create](https://www.npmjs.com/org/create).
   - Organization name: `wilt`
   - This is required before you can publish scoped packages under `@wilt/`.

3. **Log in to npm** in your terminal:
   ```bash
   npm login
   # Enter your username, password, and OTP if 2FA is enabled
   ```

### First-time publish

Scoped packages are **private by default** on npm — pass `--access public` to publish them publicly (free).

```bash
# 1. Build both packages
pnpm build

# 2. Publish @wilt/core
cd packages/core
npm publish --access public

# 3. Publish @wilt/cli
cd ../cli
npm publish --access public
```

Or publish all packages from the root in one command:

```bash
pnpm build
pnpm -r publish --access public
```

### Publishing updates

1. Bump the version in the package's `package.json` (`major.minor.patch`).
2. Build and publish:

```bash
# Bump version (pick one)
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

pnpm build
npm publish --access public
```

Or use a consistent version across both packages:

```bash
# From repo root — bump both packages to the same version
pnpm -r exec npm version minor
pnpm build
pnpm -r publish --access public
```

### Dry run (preview what gets published)

```bash
cd packages/core && npm publish --dry-run
cd packages/cli  && npm publish --dry-run
```

This shows the exact files that will be uploaded without actually publishing.

### What gets published

`@wilt/core` — controlled by the `files` field in [packages/core/package.json](./packages/core/package.json):
```
dist/    ← compiled JS + type declarations
src/     ← TypeScript source (for source maps)
```

`@wilt/cli` — controlled by the `files` field in [packages/cli/package.json](./packages/cli/package.json):
```
dist/    ← compiled JS binary
bin/     ← TypeScript source
```

### Keeping versions in sync

Both packages are versioned independently. If a CLI release depends on a new core API, update the `@wilt/core` version in `packages/cli/package.json` accordingly.

---

## License

MIT
