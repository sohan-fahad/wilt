import { Body, Controller, HttpCode, Inject, Post, ResponseUtil, ZodValidate } from "@wilt/core";
import type { Ctx } from "@app/context";
import { LoginSchema, type LoginDto } from "./dto/login.dto";
import { RefreshSchema, type RefreshDto } from "./dto/refresh.dto";
import { RegisterSchema, type RegisterDto } from "./dto/register.dto";
import { AuthService } from "./auth.service";

@Controller("/auth")
export class AuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Post("/register")
  @ZodValidate(RegisterSchema)
  async register(c: Ctx, @Body() body: RegisterDto) {
    const tokens = await this.authService.register(c, body);
    return ResponseUtil.success(c, tokens, "Registered successfully", 201);
  }

  @Post("/login")
  @ZodValidate(LoginSchema)
  @HttpCode(200)
  async login(c: Ctx, @Body() body: LoginDto) {
    const tokens = await this.authService.login(c, body);
    return ResponseUtil.success(c, tokens, "Logged in successfully");
  }

  @Post("/refresh")
  @ZodValidate(RefreshSchema)
  @HttpCode(200)
  async refresh(c: Ctx, @Body() body: RefreshDto) {
    const tokens = await this.authService.refresh(c, body.refreshToken);
    return ResponseUtil.success(c, tokens, "Tokens refreshed");
  }

  @Post("/logout")
  @ZodValidate(RefreshSchema)
  @HttpCode(200)
  async logout(c: Ctx, @Body() body: RefreshDto) {
    await this.authService.logout(c, body.refreshToken);
    return ResponseUtil.success(c, null, "Logged out successfully");
  }
}
