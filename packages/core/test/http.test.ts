import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { Context } from "hono";
import {
	Module,
	Controller,
	Injectable,
	Inject,
	Get,
	Post,
	Body,
	Param,
	Query,
	HttpCode,
	Header,
	UseGuards,
	UseInterceptors,
	UseFilters,
	Catch,
	SetMetadata,
	ZodValidate,
	QueryValidate,
	createModule,
	Reflector,
	HttpException,
	type CanActivate,
	type ExecutionContext,
	type NestInterceptor,
	type CallHandler,
	type ExceptionFilter,
	type ArgumentsHost,
} from "../src";

describe("routing", () => {
	it("normalizes prefixes and paths regardless of slashes", async () => {
		@Injectable()
		class GreetService {
			greet() {
				return "hi";
			}
		}

		@Controller("greetings")
		class GreetController {
			constructor(@Inject(GreetService) private service: GreetService) {}

			@Get("casual/")
			casual() {
				return { message: this.service.greet() };
			}

			@Get("/")
			index() {
				return { message: "index" };
			}
		}

		@Module({ controllers: [GreetController], providers: [GreetService] })
		class AppModule {}

		const app = createModule(AppModule);

		const casual = await app.request("/greetings/casual");
		expect(casual.status).toBe(200);
		expect(await casual.json()).toEqual({ message: "hi" });

		const index = await app.request("/greetings");
		expect(index.status).toBe(200);
		expect(await index.json()).toEqual({ message: "index" });
	});

	it("defaults POST to 201 and honors @HttpCode and @Header", async () => {
		@Controller("/items")
		class ItemsController {
			@Post()
			create(@Body() body: any) {
				return { created: body.name };
			}

			@Post("/legacy")
			@HttpCode(200)
			@Header("x-custom", "yes")
			legacy(@Body() body: any) {
				return { created: body.name };
			}
		}

		@Module({ controllers: [ItemsController] })
		class AppModule {}

		const app = createModule(AppModule);

		const created = await app.request("/items", {
			method: "POST",
			body: JSON.stringify({ name: "thing" }),
			headers: { "content-type": "application/json" },
		});
		expect(created.status).toBe(201);
		expect(await created.json()).toEqual({ created: "thing" });

		const legacy = await app.request("/items/legacy", {
			method: "POST",
			body: JSON.stringify({ name: "old" }),
			headers: { "content-type": "application/json" },
		});
		expect(legacy.status).toBe(200);
		expect(legacy.headers.get("x-custom")).toBe("yes");
	});

	it("resolves @Param and @Query decorators", async () => {
		@Controller("/echo")
		class EchoController {
			@Get("/:id")
			echo(@Param("id") id: string, @Query("verbose") verbose: string | undefined) {
				return { id, verbose: verbose ?? null };
			}
		}

		@Module({ controllers: [EchoController] })
		class AppModule {}

		const app = createModule(AppModule);
		const res = await app.request("/echo/42?verbose=1");
		expect(await res.json()).toEqual({ id: "42", verbose: "1" });
	});

	it("does not duplicate inherited routes in subclasses", async () => {
		@Controller("/base")
		class BaseController {
			@Get("/ping")
			ping() {
				return { pong: true };
			}
		}

		@Controller("/sub")
		class SubController extends BaseController {
			@Get("/extra")
			extra() {
				return { extra: true };
			}
		}

		const baseRoutes = (BaseController.prototype as any).routes;
		const subRoutes = (SubController.prototype as any).routes;
		expect(baseRoutes).toHaveLength(1);
		expect(subRoutes).toHaveLength(2);

		@Module({ controllers: [BaseController, SubController] })
		class AppModule {}

		const app = createModule(AppModule);
		expect((await app.request("/base/ping")).status).toBe(200);
		expect((await app.request("/sub/ping")).status).toBe(200);
		expect((await app.request("/sub/extra")).status).toBe(200);
		expect((await app.request("/base/extra")).status).toBe(404);
	});
});

describe("validation pipeline", () => {
	const CreateDto = z.object({
		name: z.string().min(2),
		role: z.string().default("user"),
	});

	@Controller("/users")
	class UsersController {
		@Post()
		@ZodValidate(CreateDto)
		create(@Body() body: z.infer<typeof CreateDto>) {
			return { received: body };
		}

		@Get()
		@QueryValidate(z.object({ page: z.coerce.number().default(1) }))
		list(c: Context) {
			return { page: (c.get("validatedQuery") as { page: number }).page };
		}
	}

	@Module({ controllers: [UsersController] })
	class AppModule {}

	const app = createModule(AppModule);

	it("passes the validated (transformed) body to @Body()", async () => {
		const res = await app.request("/users", {
			method: "POST",
			body: JSON.stringify({ name: "alice" }),
			headers: { "content-type": "application/json" },
		});
		expect(res.status).toBe(201);
		// `role` default only exists if the *validated* value reaches the handler
		expect(await res.json()).toEqual({ received: { name: "alice", role: "user" } });
	});

	it("rejects invalid bodies with a 400 VALIDATION_ERROR", async () => {
		const res = await app.request("/users", {
			method: "POST",
			body: JSON.stringify({ name: "x" }),
			headers: { "content-type": "application/json" },
		});
		expect(res.status).toBe(400);
		const json = (await res.json()) as any;
		expect(json.success).toBe(false);
		expect(json.error.code).toBe("VALIDATION_ERROR");
		expect(json.error.details[0].field).toBe("name");
	});

	it("validates query params and exposes them via validatedQuery", async () => {
		const res = await app.request("/users?page=3");
		expect(await res.json()).toEqual({ page: 3 });
	});
});

describe("guards, interceptors and filters", () => {
	it("runs guards with DI and rejects with 403 when canActivate returns false", async () => {
		const IS_PUBLIC = "isPublic";

		@Injectable()
		class PublicOnlyGuard implements CanActivate {
			constructor(@Inject(Reflector) private reflector: Reflector) {}

			canActivate(context: ExecutionContext): boolean {
				return this.reflector.get<boolean>(IS_PUBLIC, context.getHandler()) === true;
			}
		}

		@Controller("/guarded")
		@UseGuards(PublicOnlyGuard)
		class GuardedController {
			@Get("/open")
			@SetMetadata(IS_PUBLIC, true)
			open() {
				return { ok: true };
			}

			@Get("/closed")
			closed() {
				return { ok: true };
			}
		}

		@Module({ controllers: [GuardedController], providers: [PublicOnlyGuard] })
		class AppModule {}

		const app = createModule(AppModule);
		app.onError((err, c) =>
			err instanceof HttpException
				? c.json({ message: err.message }, err.getStatus() as any)
				: c.json({ message: "unexpected" }, 500)
		);

		expect((await app.request("/guarded/open")).status).toBe(200);
		expect((await app.request("/guarded/closed")).status).toBe(403);
	});

	it("wraps handlers with interceptors in registration order", async () => {
		const order: string[] = [];

		@Injectable()
		class FirstInterceptor implements NestInterceptor {
			async intercept(_ctx: ExecutionContext, next: CallHandler) {
				order.push("first:before");
				const result = await next.handle();
				order.push("first:after");
				return result;
			}
		}

		@Injectable()
		class SecondInterceptor implements NestInterceptor {
			async intercept(_ctx: ExecutionContext, next: CallHandler) {
				order.push("second:before");
				const result = await next.handle();
				order.push("second:after");
				return result;
			}
		}

		@Controller("/intercepted")
		@UseInterceptors(FirstInterceptor, SecondInterceptor)
		class InterceptedController {
			@Get()
			get() {
				order.push("handler");
				return { ok: true };
			}
		}

		@Module({
			controllers: [InterceptedController],
			providers: [FirstInterceptor, SecondInterceptor],
		})
		class AppModule {}

		const app = createModule(AppModule);
		await app.request("/intercepted");
		expect(order).toEqual([
			"first:before",
			"second:before",
			"handler",
			"second:after",
			"first:after",
		]);
	});

	it("routes matching exceptions through @Catch filters", async () => {
		class TeapotError extends Error {}

		@Catch(TeapotError)
		class TeapotFilter implements ExceptionFilter {
			catch(_exception: TeapotError, host: ArgumentsHost): Response {
				const c = host.switchToHttp().getRequest<Context>();
				return c.json({ teapot: true }, 418 as any);
			}
		}

		@Controller("/tea")
		@UseFilters(TeapotFilter)
		class TeaController {
			@Get()
			get(): never {
				throw new TeapotError("short and stout");
			}
		}

		@Module({ controllers: [TeaController] })
		class AppModule {}

		const app = createModule(AppModule);
		const res = await app.request("/tea");
		expect(res.status).toBe(418);
		expect(await res.json()).toEqual({ teapot: true });
	});
});
