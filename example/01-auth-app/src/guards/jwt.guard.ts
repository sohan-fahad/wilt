import { Injectable, UnauthorizedException } from "@wilt/core";
import type { CanActivate, ExecutionContext } from "@wilt/core";
import type { Ctx, CurrentUser } from "@app/context";
import { verifyJwt } from "../utils/crypto";

export type { CurrentUser };

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const c = context.switchToHttp().getRequest<Ctx>();
    const auth = c.req.header("Authorization");

    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing Bearer token");

    const token = auth.slice(7);
    try {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      c.set("currentUser", { id: payload.sub, email: payload.email as string } satisfies CurrentUser);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
