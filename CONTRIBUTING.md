# Contributing to Ajke

Thanks for your interest in contributing! This guide covers everything you need to get started.

## What is Ajke?

Ajke is a pnpm monorepo with three parts:

| Part | Location | Purpose |
|---|---|---|
| **Framework** | `packages/core/` | The library — decorators, DI, middleware, pipes. Published as `@ajke/core`. |
| **CLI** | `packages/cli/` | `ajke new`, `ajke generate`, `ajke add` — scaffolding commands. Published as `@ajke/cli`. |
| **Reference app** | `example/ajke-test/` | An example app exercising the framework end to end. Not published. |

If you're fixing a decorator or DI bug → work in `packages/core/src/`.
If you're improving scaffolding → work in `packages/cli/bin/`.

## Setup

```bash
pnpm install
pnpm build        # builds @ajke/core and @ajke/cli (the example app resolves @ajke/core from packages/core/dist)
```

## Development loop

```bash
pnpm check                        # type-check all packages
pnpm --filter @ajke/core test     # framework unit tests (plain Node + vitest)
cd example/ajke-test && pnpm test # integration tests in a real Workers runtime
pnpm lint
```

After changing `packages/core/src/`, rebuild (`pnpm build:core`) before re-running the example app's checks or tests — it consumes the built `dist/`.

## Guidelines

- TypeScript strict mode; avoid `any`.
- Every new public export must go through `packages/core/src/index.ts`.
- Add or update tests in `packages/core/test/` for framework behavior changes.
- Don't mock D1 or other bindings in the example app's tests — they run in a real Workers runtime.
- Keep commit messages descriptive; one logical change per commit.
