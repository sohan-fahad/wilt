import { drizzle } from "drizzle-orm/d1";
import type { Ctx } from "@app/context";
import { schema } from "./schema";
export function getDb(c: Ctx) {
  return drizzle(c.env.DB, { schema: schema });
}
