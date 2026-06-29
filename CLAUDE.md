# Wilt — AI Assistant Guide

## What this repo is

Wilt is a NestJS-like framework for Cloudflare Workers built on [Hono](https://hono.dev). It is a pnpm monorepo:

| Part | Location | Purpose |
|---|---|---|
| **Framework core** | `packages/core/` | Published as `@wilt/core` — decorators, DI, middleware, pipes, exceptions |
| **CLI** | `packages/cli/` | Published as `@wilt/cli` — `wilt new`, `wilt generate`, `wilt add` |
| **Reference app** | `example/ajke-test/` | Large example app built with the framework; not published |

## Commands (repo root)

```bash
pnpm install      # install all workspace deps
pnpm build        # build all packages (core must be built before the example app type-checks)
pnpm build:core   # build @wilt/core only
pnpm build:cli    # build @wilt/cli only
pnpm check        # TypeScript check across all packages
pnpm test         # run all tests (core unit tests + example app Workers tests)
pnpm lint         # ESLint over packages/
pnpm format       # Prettier over packages/
```

In `example/ajke-test/`: `pnpm dev` (Vite, port 4001), `pnpm test` (Workers runtime via vitest-pool-workers), `pnpm db:migrate` (local D1).

## Architecture (packages/core/src/)

- **decorators/core/** — `@Injectable`, `@Inject`, `@Optional`, `@SetMetadata`, `@UseGuards`, `@UseInterceptors`, `@Catch`, `@UseFilters`
- **decorators/http/** — `@Controller`, `@Get`/`@Post`/`@Put`/`@Delete`/`@Patch`, `@Body`/`@Param`/`@Query`/`@Headers`/`@Ip`/`@Req`, `@HttpCode`, `@Header`, `@Redirect`
- **decorators/modules/** — `@Module`, `@Global`
- **injector/** — `createModule`, `compileModuleTree`, `resolveToken`; token-based DI supporting class providers, `{ provide, useValue | useClass | useFactory | useExisting }`, string/symbol tokens, dynamic modules (`forRoot` pattern), and circular dependencies via `forwardRef()`
- **pipes/** — `@ZodValidate`, `@QueryValidate`, `@Validate` — metadata-only; validation runs in the route pipeline, validated body reaches `@Body()` args and `c.get("validatedData")` / `c.get("validatedQuery")`
- **exceptions/** — `HttpException` + subclasses for 400–504
- **context/** — `ExecutionContext`, `ArgumentsHost`, `AppContext`/`WiltBindings`
- **middleware/** — `errorHandler`, `requestLogger`
- **services/** — `Reflector` (always registered in the DI container)
- **utils/** — `ResponseUtil`, `Logger`, `forwardRef`, `applyDecorators`

New public exports must go through `packages/core/src/index.ts`.

### Request execution order
middleware → guards → interceptors (pre) → validation pipes → handler → interceptors (post) → exception filters (on throw)

### DI rules
- Always use explicit `@Inject(Token)` in constructors — Vite/esbuild builds never emit `design:paramtypes`, so implicit injection only works under tsc.
- Circular providers: `@Inject(forwardRef(() => Other))` on **both** sides; circular module imports need `forwardRef(() => OtherModule)` in both `imports` arrays.
- Plain-object returns from handlers with parameter decorators are auto-serialized with `c.json()`; POST defaults to 201 unless `@HttpCode` is set.

## Key conventions

- TypeScript strict mode; no `any` unless unavoidable
- No comments explaining what the code does — only the non-obvious *why*
- No unnecessary abstractions
- Core tests (`packages/core/test/`) run on plain Node with vitest; example app tests run against a real Workers runtime — do not mock D1 or other bindings
