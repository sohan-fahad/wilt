import { Body, Controller, Get, HttpCode, Inject, Patch, ResponseUtil, UseGuards, ZodValidate } from "@wilt/core";
import type { Ctx } from "@app/context";
import { JwtGuard, type CurrentUser } from "../../../guards/jwt.guard";
import { UpdateMeSchema, type UpdateMeDto } from "./dto/update-me.dto";
import { UsersService } from "./users.service";

@Controller("/users")
@UseGuards(JwtGuard)
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) { }

  @Get("/me")
  async getMe(c: Ctx) {
    const user = c.get("currentUser") as CurrentUser;
    const profile = await this.usersService.findById(c, user.id);
    return ResponseUtil.success(c, profile);
  }

  @Patch("/me")
  @ZodValidate(UpdateMeSchema)
  @HttpCode(200)
  async updateMe(c: Ctx, @Body() body: UpdateMeDto) {
    const user = c.get("currentUser") as CurrentUser;
    const updated = await this.usersService.updateMe(c, user.id, body);
    return ResponseUtil.success(c, updated, "Profile updated");
  }
}
