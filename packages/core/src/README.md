# Wilt — NestJS-like Framework for Cloudflare Workers

A lightweight, NestJS-inspired framework for building modular APIs on Cloudflare Workers using Hono as the HTTP layer.

---

## Core Concepts

| Concept | Decorator / API | Purpose |
|---|---|---|
| Module | `@Module` | Group controllers and providers |
| Global Module | `@Global` | Make a module's providers available everywhere |
| Controller | `@Controller` | Handle HTTP routes |
| Provider | `@Injectable` | Injectable service |
| Custom injection | `@Inject` | Explicit token injection |
| Optional dep | `@Optional` | Inject `undefined` if provider not registered |
| Guards | `@UseGuards` | Authorization — block requests early |
| Interceptors | `@UseInterceptors` | Transform requests/responses (logging, caching) |
| Exception filters | `@UseFilters` / `@Catch` | Handle specific thrown exceptions |
| Metadata | `@SetMetadata` + `Reflector` | Attach and read custom metadata |
| Lifecycle hooks | `OnModuleInit` | Run code after DI wiring |

---

## HTTP Decorators

### Route mapping
```typescript
@Get(path?)   @Post(path?)   @Put(path?)   @Delete(path?)   @Patch(path?)
```

### Parameter decorators
Extract values directly as handler arguments — no manual `c.req` parsing needed.

```typescript
@Body(property?)      // entire body, or body[property]
@Param(name?)         // route param :name, or all params
@Query(name?)         // query string ?name=, or all queries
@Headers(name?)       // single header, or all headers as object
@Ip()                 // client IP (CF-Connecting-IP / X-Forwarded-For)
@Req()                // full Hono Context — escape hatch
```

### Response decorators
```typescript
@HttpCode(201)                   // override default 200/204
@Header('Cache-Control', 'no-store')   // set response header
@Redirect('/new-url', 301)       // redirect (handler can return { url, statusCode } to override)
```

---

## Validation

```typescript
@ZodValidate(schema)    // validate request body with Zod; result in c.get('validatedData')
@QueryValidate(schema)  // validate query params with Zod; result in c.get('validatedQuery')
```

---

## Guards

Implement `CanActivate` and decorate with `@UseGuards`.

```typescript
import { Injectable, CanActivate, ExecutionContext, UseGuards } from 'wilt';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const c = context.switchToHttp().getRequest();
    return !!c.req.header('authorization');
  }
}

@Controller('/users')
@UseGuards(AuthGuard)
export class UsersController { ... }
```

A guard returning `false` (or throwing) causes Wilt to throw `ForbiddenException` automatically.

---

## Interceptors

Implement `NestInterceptor`. Useful for logging, response transformation, caching.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UseInterceptors } from 'wilt';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const result = await next.handle();
    console.log(`Took ${Date.now() - start}ms`);
    return result;
  }
}

@Get()
@UseInterceptors(LoggingInterceptor)
async getAll() { ... }
```

---

## Exception Filters

Implement `ExceptionFilter` and mark the exception types to catch with `@Catch`.

```typescript
import { Catch, ExceptionFilter, ArgumentsHost, HttpException, UseFilters } from 'wilt';
import type { Context } from 'hono';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): Response {
    const c = host.switchToHttp().getRequest<Context>();
    return c.json({
      statusCode: exception.getStatus(),
      message: exception.getResponse(),
    }, exception.getStatus() as any);
  }
}

@Controller('/users')
@UseFilters(HttpExceptionFilter)
export class UsersController { ... }
```

---

## HTTP Exceptions

Throw these anywhere — the built-in `errorHandler` middleware catches them and returns the right status automatically.

```typescript
throw new BadRequestException('Invalid input');
throw new UnauthorizedException();
throw new ForbiddenException('Insufficient permissions');
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
throw new UnprocessableEntityException({ message: 'Validation failed', errors: [...] });
throw new TooManyRequestsException();
throw new InternalServerErrorException();
```

All extend `HttpException`. You can extend it yourself:
```typescript
export class CustomException extends HttpException {
  constructor() { super('Custom error', 418); }
}
```

---

## SetMetadata + Reflector

Attach arbitrary metadata to a handler or class, then read it inside a guard or interceptor.

```typescript
// Define a helper decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Use it on a route
@Roles('admin')
@Get()
async adminRoute() { ... }

// Read it in a guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const cls = context.getClass();
    const required = this.reflector.getAllAndOverride<string[]>('roles', [handler, cls]);
    if (!required) return true;
    // ... check user roles
  }
}
```

---

## Lifecycle Hooks

Implement `OnModuleInit` to run code after all DI wiring is done.

```typescript
import { Injectable, OnModuleInit } from 'wilt';

@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await this.connect();
  }
}
```

---

## Dependency Injection

### Basic injection
```typescript
@Injectable()
class ServiceA { }

@Injectable()
class ServiceB {
  constructor(private a: ServiceA) {}
}
```

### Explicit token
```typescript
constructor(@Inject(MyService) private svc: MyService) {}
```

### Circular dependencies
```typescript
constructor(@Inject(forwardRef(() => ServiceB)) private b: ServiceB) {}
```

### Optional
```typescript
constructor(@Optional() private cache?: CacheService) {}
```

---

## Auto-Serialization

When parameter decorators (`@Body`, `@Param`, etc.) are used on a handler, Wilt automatically serializes the return value:

- `Response` object → returned as-is
- Plain object / array → `c.json(result, 200)` (or `@HttpCode` value)
- `undefined` / `null` → `204 No Content`

Without parameter decorators the handler receives the raw Hono `Context` as the first argument (backward-compatible with existing code).

---

## Module Setup

```typescript
// src/index.ts
import { createModule } from 'wilt';
import { errorHandler, requestLogger } from 'wilt';
import { AppModule } from './app.module';

const app = createModule(AppModule, {
  middlewares: [errorHandler, requestLogger],
});

export default { fetch: app.fetch };
```

---

## File Structure

```
src/wilt/
├── context/          # ExecutionContext, ArgumentsHost
├── decorators/
│   ├── core/         # @Injectable, @Inject, @Optional, @SetMetadata, @UseGuards, @UseInterceptors, @UseFilters, @Catch
│   ├── http/         # @Controller, @Get…@Patch, @Body…@Req, @HttpCode, @Header, @Redirect
│   └── modules/      # @Module, @Global
├── exceptions/       # HttpException + BadRequestException, NotFoundException, etc.
├── injector/         # createModule, resolveInstance, collectModuleTree
├── interfaces/
│   ├── core/         # CanActivate, NestInterceptor, ExceptionFilter, PipeTransform, lifecycle hooks
│   ├── http/         # BaseResponse, PaginatedResponse, ErrorResponse
│   └── modules/      # ModuleMetadata, RouteMetadata, ForwardReference
├── middleware/       # errorHandler, requestLogger
├── pipes/            # @ZodValidate, @QueryValidate, @Validate
├── services/         # Reflector
└── utils/            # ResponseUtil, Logger, forwardRef, applyDecorators
```
