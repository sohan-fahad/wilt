// Managed by `wilt add` and `pnpm cf-typegen`.
// Run `pnpm wilt add kv|r2|d1|ai|...` to add a binding — types update automatically.
// Run `pnpm cf-typegen` to regenerate from wrangler.jsonc at any time.
/// <reference types="@cloudflare/vitest-pool-workers/types" />
interface CloudflareBindings {
  DB: D1Database;
  MODE: string;
  JWT_SECRET: string;
}

declare namespace Cloudflare {
  interface Env extends CloudflareBindings {
    TEST_MIGRATIONS: string;
  }
}
