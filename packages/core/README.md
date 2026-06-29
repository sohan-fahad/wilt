# @wilt/core

A lightweight, NestJS-inspired framework for building modular APIs on Cloudflare Workers using [Hono](https://hono.dev) as the HTTP layer.

## Installation

```bash
npm install @wilt/core hono reflect-metadata zod
```

Your `tsconfig.json` must have:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

> **Note:** Vite/esbuild never emit `design:paramtypes`, so always use explicit `@Inject(Token)` on constructor parameters. It works in every build setup.

---

## Quick Start

```typescript
// src/index.ts
import "reflect-metadata";
import { app } from "./app.module";

export default {
  fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
```

```typescript
// src/app.module.ts
import { Module, createModule } from "@wilt/core";
import { errorHandler, requestLogger } from "@wilt/core/middleware";
import { HelloModule } from "./modules/hello/hello.module";

@Module({ imports: [HelloModule] })
export class AppModule {}

export const app = createModule(AppModule, {
  middlewares: [errorHandler, requestLogger],
});
```

```typescript
// src/modules/hello/hello.module.ts
import { Module } from "@wilt/core";
import { HelloController } from "./hello.controller";
import { HelloService } from "./hello.service";

@Module({ controllers: [HelloController], providers: [HelloService] })
export class HelloModule {}
```

```typescript
// src/modules/hello/hello.controller.ts
import { Controller, Get, Inject } from "@wilt/core";
import { HelloService } from "./hello.service";

@Controller("/hello")
export class HelloController {
  constructor(@Inject(HelloService) private readonly helloService: HelloService) {}

  @Get()
  greet() {
    return { message: this.helloService.greet() }; // auto-serialized with c.json()
  }
}
```

```typescript
// src/modules/hello/hello.service.ts
import { Injectable } from "@wilt/core";

@Injectable()
export class HelloService {
  greet() {
    return "Hello from Wilt!";
  }
}
```

---

## Dependency Injection

Providers are singletons resolved from the module tree. Inject them by class, string, or symbol token:

```typescript
@Module({
  providers: [
    UserService,                                              // class shorthand
    { provide: "API_URL", useValue: "https://api.example.com" },
    { provide: "HTTP", useClass: FetchHttpClient },
    { provide: "SIGNER", useFactory: (url: string) => createSigner(url), inject: ["API_URL"] },
    { provide: "HTTP_ALIAS", useExisting: "HTTP" },
  ],
})
export class AppModule {}
```

```typescript
@Injectable()
export class UserService {
  constructor(
    @Inject("API_URL") private readonly apiUrl: string,
    @Optional() @Inject("CACHE") private readonly cache?: KVCache,
  ) {}
}
```

### Circular dependencies

Use `forwardRef` on **both** sides:

```typescript
@Injectable()
export class OrderService {
  constructor(@Inject(forwardRef(() => PaymentService)) private payments: PaymentService) {}
}

@Injectable()
export class PaymentService {
  constructor(@Inject(forwardRef(() => OrderService)) private orders: OrderService) {}
}
```

The second side receives a lazy proxy that resolves once the real instance exists — don't call methods on it inside the constructor.

Circular **module** imports work the same way: `imports: [forwardRef(() => OtherModule)]` in both modules.

### Global and dynamic modules

```typescript
@Global()
@Module({ providers: [ConfigService] })
export class ConfigModule {}
```

```typescript
@Module({})
export class CacheModule {
  static forRoot(ttl: number): DynamicModule {
    return {
      module: CacheModule,
      providers: [{ provide: "CACHE_TTL", useValue: ttl }, CacheService],
      global: true,
    };
  }
}

@Module({ imports: [CacheModule.forRoot(60)] })
export class AppModule {}
```

---

## Request pipeline

```
middleware → guards → interceptors (pre) → validation pipes → handler → interceptors (post) → exception filters (on throw)
```

### Parameter decorators

```typescript
@Post("/:id")
update(
  @Param("id") id: string,
  @Body() body: UpdateDto,
  @Query("force") force: string | undefined,
  @Headers("authorization") auth: string | undefined,
  @Ip() ip: string,
  c: Context, // any undecorated slot receives the raw Hono context
) { ... }
```

Plain-object returns are auto-serialized via `c.json()`. POST defaults to **201**; override with `@HttpCode(...)`. Handlers without parameter decorators receive the raw Hono `Context` as their first argument.

### Validation

```typescript
const CreateUserDto = z.object({ email: z.string().email(), role: z.string().default("user") });

@Post()
@ZodValidate(CreateUserDto)
create(@Body() body: z.infer<typeof CreateUserDto>, c: Context) {
  // body is the validated AND transformed value (defaults applied)
  // also available as c.get("validatedData")
}

@Get()
@QueryValidate(z.object({ page: z.coerce.number().default(1) }))
list(c: Context) {
  const { page } = c.get("validatedQuery");
}
```

Invalid input short-circuits with a `400` `VALIDATION_ERROR` JSON response.

### Guards

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>("isPublic", context.getHandler());
    if (isPublic) return true;
    const c = context.switchToHttp().getRequest<Context>();
    return verify(c.req.header("authorization"));
  }
}

@Controller("/users")
@UseGuards(AuthGuard)
export class UserController { ... }
```

A guard returning `false` results in a `ForbiddenException` (403); throw your own exception for other statuses. Guards are resolved through DI — register them as providers to inject dependencies.

### Interceptors

```typescript
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const result = await next.handle();
    console.log(`${context.getHandler().name} took ${Date.now() - start}ms`);
    return result;
  }
}
```

### Exception filters

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): Response {
    const c = host.switchToHttp().getRequest<Context>();
    return c.json({ error: exception.getResponse() }, exception.getStatus() as any);
  }
}
```

---

## Exceptions

`HttpException` plus subclasses: `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `MethodNotAllowed`, `NotAcceptable`, `RequestTimeout`, `Conflict`, `Gone`, `PreconditionFailed`, `PayloadTooLarge`, `UnsupportedMediaType`, `UnprocessableEntity`, `TooManyRequests`, `InternalServerError`, `NotImplemented`, `BadGateway`, `ServiceUnavailable`, `GatewayTimeout` (+`Exception` suffix).

The `errorHandler` middleware converts them (and Zod errors) into consistent JSON error responses.

## Lifecycle hooks

`onModuleInit` and `onApplicationBootstrap` are invoked on all instantiated providers when `createModule` finishes wiring.

## Typed bindings

```typescript
// src/context.ts
import type { AppContext } from "@wilt/core";

declare module "@wilt/core" {
  interface WiltBindings extends CloudflareBindings {}
}

export type Ctx = AppContext; // Context with your D1/KV/R2 bindings typed
```
