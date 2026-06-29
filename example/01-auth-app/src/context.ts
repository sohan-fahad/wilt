import type { Context } from "hono";

declare module "@wilt/core" {
  interface WiltBindings extends CloudflareBindings {}
}

export interface CurrentUser {
  id: string;
  email: string;
}

export type Ctx = Context<{
  Bindings: CloudflareBindings;
  Variables: {
    currentUser: CurrentUser;
  };
}>;
