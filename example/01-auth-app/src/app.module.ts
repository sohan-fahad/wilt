import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { Module, createModule } from "@wilt/core";
import { requestLogger } from "@wilt/core/middleware";
import { AuthModule } from "./modules/app/auth/auth.module";
import { UsersModule } from "./modules/app/users/users.module";

@Module({
  imports: [AuthModule, UsersModule],
})
export class AppModule { }

const app = createModule(AppModule, {
  middlewares: [cors(), secureHeaders(), requestLogger],
});

app.get("/", (c) => c.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));
app.get("/health", (c) => c.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));

export { app };
