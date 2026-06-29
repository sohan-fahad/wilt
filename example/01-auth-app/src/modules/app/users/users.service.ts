import { eq } from "drizzle-orm";
import { Injectable, NotFoundException } from "@wilt/core";
import type { Ctx } from "@app/context";
import { getDb } from "../../../database/connection";
import { users } from "../../../database/schema";

@Injectable()
export class UsersService {
  async findById(c: Ctx, id: string) {
    const db = getDb(c);
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateMe(c: Ctx, id: string, data: { name?: string }) {
    const db = getDb(c);
    const now = Math.floor(Date.now() / 1000);
    await db.update(users).set({ ...data, updatedAt: now }).where(eq(users.id, id));
    return this.findById(c, id);
  }
}
