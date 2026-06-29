import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { ConflictException, Injectable, UnauthorizedException } from "@wilt/core";
import type { Ctx } from "@app/context";
import { getDb } from "../../../database/connection";
import { refreshTokens, users } from "../../../database/schema";
import { hashPassword, hashToken, signJwt, verifyJwt, verifyPassword } from "../../../utils/crypto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_TTL = 15 * 60;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  async register(c: Ctx, data: { email: string; password: string; name?: string }): Promise<TokenPair> {
    const db = getDb(c);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length > 0) throw new ConflictException("Email already registered");

    const id = ulid();
    const passwordHash = await hashPassword(data.password);
    await db.insert(users).values({ id, email: data.email, passwordHash, name: data.name ?? null });

    return this.issueTokens(c, { id, email: data.email });
  }

  async login(c: Ctx, data: { email: string; password: string }): Promise<TokenPair> {
    const db = getDb(c);
    const [user] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(c, { id: user.id, email: user.email });
  }

  async refresh(c: Ctx, token: string): Promise<TokenPair> {
    const payload = await verifyJwt(token, c.env.JWT_SECRET).catch(() => {
      throw new UnauthorizedException("Invalid refresh token");
    });

    const db = getDb(c);
    const tokenHash = await hashToken(token);
    const [stored] = await db
      .select({ id: refreshTokens.id, userId: refreshTokens.userId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) throw new UnauthorizedException("Refresh token revoked");

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException("User not found");

    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    return this.issueTokens(c, user);
  }

  async logout(c: Ctx, token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    await getDb(c).delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  }

  private async issueTokens(c: Ctx, user: { id: string; email: string }): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const secret = c.env.JWT_SECRET;

    const accessToken = await signJwt(
      { sub: user.id, email: user.email, iat: now, exp: now + ACCESS_TOKEN_TTL },
      secret
    );
    const refreshToken = await signJwt(
      { sub: user.id, jti: ulid(), iat: now, exp: now + REFRESH_TOKEN_TTL },
      secret
    );

    const tokenHash = await hashToken(refreshToken);
    await getDb(c)
      .insert(refreshTokens)
      .values({ id: ulid(), userId: user.id, tokenHash, expiresAt: now + REFRESH_TOKEN_TTL });

    return { accessToken, refreshToken };
  }
}
