# Changelog

All notable changes to Wilt are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — Unreleased

### Added

- **Custom providers** — `{ provide, useValue }`, `{ provide, useClass }`, `{ provide, useFactory, inject }`, `{ provide, useExisting }`, with string/symbol/class injection tokens
- **Dynamic modules** — `static forRoot()` returning `{ module, providers, global, ... }`
- **Lifecycle** — `onApplicationBootstrap` now runs after `onModuleInit`
- **Exceptions** — `NotAcceptableException`, `RequestTimeoutException`, `PreconditionFailedException`, `PayloadTooLargeException`, `UnsupportedMediaTypeException`, `BadGatewayException`, `GatewayTimeoutException`
- **Logger** exported from `@wilt/core`
- Framework test suite (`packages/core/test/`)

### Changed

- **Validation pipes are now metadata-driven** — `@ZodValidate` / `@QueryValidate` / `@Validate` no longer wrap the handler; validation runs in the route pipeline. The Zod-validated (transformed) body now reaches `@Body()` parameters, and decorator order no longer affects `@HttpCode` / `@Header`.
- **Guards run before interceptors**, matching NestJS execution order.
- Guards, interceptors and filters are resolved through the DI container (constructor injection works, e.g. `Reflector`).
- Route paths are normalized — prefixes and paths join correctly regardless of leading/trailing slashes.
- POST routes with auto-serialized plain-object returns default to **201** (override with `@HttpCode`).
- `Reflector` is always pre-registered in the container.

### Fixed

- Circular dependency tracking no longer leaks when a provider's constructor throws.
- Controller inheritance no longer duplicates routes into the parent class.
- `applyDecorators` no longer mutates (and reverses) the given decorator array.
- `ResponseUtil.paginated` no longer returns `Infinity` total pages when `limit` is 0.
- `@Optional` / `@Inject` metadata no longer leaks into parent classes.

### Removed

- **tsyringe dependency** — the injector is fully self-contained; only `reflect-metadata` is required.
- Dead app-specific helpers from core utils.

---

## [0.1.0] — 2026-05-15

### Added

- **Module system** — `@Module`, `@Global`, `@Controller`, `@Injectable`, `@Inject`, `@Optional` decorators
- **HTTP decorators** — `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@HttpCode`, `@Header`, `@Redirect`
- **Parameter decorators** — `@Body`, `@Param`, `@Query`, `@Headers`, `@Ip`, `@Req` with auto-JSON serialization
- **Guards** — `@UseGuards`, `CanActivate`, `ExecutionContext`, `ArgumentsHost`
- **Interceptors** — `@UseInterceptors`, `NestInterceptor`, `CallHandler`
- **Exception filters** — `@UseFilters`, `@Catch`, `ExceptionFilter`
- **Metadata** — `@SetMetadata`, `Reflector`
- **Validation pipes** — `@ZodValidate`, `@QueryValidate`, `@Validate`
- **Exceptions** — `HttpException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `UnprocessableEntityException`, `TooManyRequestsException`, `InternalServerErrorException`
- **Lifecycle hooks** — `OnModuleInit`, `OnModuleDestroy`
- **Utilities** — `ResponseUtil`, `Logger`, `forwardRef`, `applyDecorators`
- **Middleware** — `requestLogger`, `errorHandler` (exported from `@wilt/core/middleware`)
- **CLI** — `wilt new`, `wilt generate` (module / service / controller), `wilt add` (d1, r2, kv, queue, ai, durable-object, vectorize, browser, hyperdrive)
