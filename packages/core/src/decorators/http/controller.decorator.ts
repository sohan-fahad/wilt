import type { Context } from "hono";
import type { Hono } from "hono";
import { createArgumentsHost, createExecutionContext } from "../../context/execution-context";
import {
	BODY_SCHEMA_METADATA,
	QUERY_SCHEMA_METADATA,
	VALIDATION_RULES_METADATA,
} from "../../constants";
import { CATCH_METADATA, FILTERS_METADATA } from "../core/exception-filters.decorator";
import { GUARDS_METADATA } from "../core/use-guards.decorator";
import { INTERCEPTORS_METADATA } from "../core/use-interceptors.decorator";
import { HEADER_METADATA } from "./header.decorator";
import { HTTP_CODE_METADATA } from "./http-code.decorator";
import { REDIRECT_METADATA, type RedirectMetadata } from "./redirect.decorator";
import { ROUTE_PARAMS_METADATA, TOTAL_PARAMS_METADATA, type RouteParamMetadata } from "./route-params.decorator";
import { ForbiddenException } from "../../exceptions/http-exceptions";
import { resolveToken, type ResolutionContext } from "../../injector/injector";
import type { RouteMetadata } from "../../interfaces/modules/module.interface";
import type { ValidationRule } from "../../pipes/validate.pipe";

export const CONTROLLER_PREFIX_METADATA = "wilt:controller-prefix";

export function Controller(prefix: string = "") {
	return (target: any) => {
		target.prototype.prefix = prefix;
		Reflect.defineMetadata(CONTROLLER_PREFIX_METADATA, prefix, target);
		return target;
	};
}

/** Joins a controller prefix and a route path into a normalized Hono path. */
export function joinPaths(...segments: string[]): string {
	const joined = segments
		.map((s) => (s ?? "").replace(/^\/+|\/+$/g, ""))
		.filter(Boolean)
		.join("/");
	return "/" + joined;
}

function toResolutionContext(
	registryOrCtx?: Map<any, any> | ResolutionContext
): ResolutionContext {
	if (registryOrCtx instanceof Map) {
		return { registry: registryOrCtx, providers: new Map(), inProgress: new Set() };
	}
	if (registryOrCtx) return registryOrCtx;
	return { registry: new Map(), providers: new Map(), inProgress: new Set() };
}

function resolveEnhancer(ClassOrInstance: any, ctx: ResolutionContext): any {
	if (typeof ClassOrInstance !== "function") return ClassOrInstance;
	return resolveToken(ClassOrInstance, ctx);
}

async function parseRequestBody(c: Context): Promise<any> {
	const contentType = c.req.header("content-type") || "";
	if (
		contentType.includes("multipart/form-data") ||
		contentType.includes("application/x-www-form-urlencoded")
	) {
		const formData = await c.req.formData();
		const body: Record<string, any> = {};
		formData.forEach((value, key) => {
			body[key] = value;
		});
		return body;
	}
	return c.req.json().catch(() => ({}));
}

function zodErrorResponse(c: Context, error: any, message: string): Response {
	const details = (error.issues ?? []).map((issue: any) => ({
		field: (issue.path ?? []).join("."),
		message: issue.message,
		code: issue.code,
	}));
	return c.json(
		{
			success: false,
			error: { code: "VALIDATION_ERROR", message, details },
			message: details[0]?.message ?? message,
			timestamp: new Date().toISOString(),
		},
		400
	);
}

function checkValidationRules(body: any, rules: ValidationRule[]): string[] {
	const errors: string[] = [];
	for (const rule of rules) {
		const value = body?.[rule.field];

		if (rule.required && (value === undefined || value === null || value === "")) {
			errors.push(`${rule.field} is required`);
			continue;
		}
		if (value === undefined || value === null) continue;

		if (rule.type) {
			const actualType = Array.isArray(value) ? "array" : typeof value;
			if (actualType !== rule.type) {
				errors.push(`${rule.field} must be of type ${rule.type}`);
			}
		}
		if (typeof value === "string") {
			if (rule.minLength && value.length < rule.minLength) {
				errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
			}
			if (rule.maxLength && value.length > rule.maxLength) {
				errors.push(`${rule.field} must be at most ${rule.maxLength} characters long`);
			}
			if (rule.pattern && !rule.pattern.test(value)) {
				errors.push(`${rule.field} format is invalid`);
			}
		}
		if (rule.custom && !rule.custom(value)) {
			errors.push(`${rule.field} validation failed`);
		}
	}
	return errors;
}

async function resolveParamArgs(
	paramMeta: RouteParamMetadata[],
	c: Context,
	totalParams: number,
	getBody: () => Promise<any>
): Promise<any[]> {
	const maxIndex = Math.max(totalParams - 1, ...paramMeta.map((p) => p.index));
	const args = new Array(maxIndex + 1).fill(undefined);
	const filledIndices = new Set(paramMeta.map((p) => p.index));

	for (const p of paramMeta) {
		switch (p.type) {
			case "body": {
				const body = await getBody();
				args[p.index] = p.data ? body?.[p.data] : body;
				break;
			}
			case "param":
				args[p.index] = p.data ? c.req.param(p.data) : c.req.param();
				break;
			case "query":
				args[p.index] = p.data ? c.req.query(p.data) : c.req.query();
				break;
			case "headers":
				args[p.index] = p.data
					? c.req.header(p.data)
					: Object.fromEntries((c.req.raw.headers as any).entries());
				break;
			case "ip":
				args[p.index] =
					c.req.header("cf-connecting-ip") ||
					c.req.header("x-forwarded-for") ||
					"";
				break;
			case "req":
				args[p.index] = c;
				break;
		}
	}

	// Any slot not covered by a decorator receives the raw Hono context
	for (let i = 0; i <= maxIndex; i++) {
		if (!filledIndices.has(i)) args[i] = c;
	}

	return args;
}

export function registerControllerRoutes(
	router: Hono<{ Bindings: any }>,
	controller: any,
	prefix: string = "",
	instanceRegistry?: Map<any, any> | ResolutionContext
) {
	const routes: RouteMetadata[] = (controller.constructor as any).prototype.routes || [];
	const controllerClass = controller.constructor;
	const diCtx = toResolutionContext(instanceRegistry);

	for (const route of routes) {
		const handlerFn = controller[route.handler as keyof typeof controller] as Function;
		const fullPath = joinPaths(prefix, route.path);
		const proto = controllerClass.prototype;

		const classGuards: any[] = Reflect.getMetadata(GUARDS_METADATA, controllerClass) || [];
		const methodGuards: any[] = Reflect.getMetadata(GUARDS_METADATA, handlerFn) || [];
		const guards = [...classGuards, ...methodGuards];

		const classInterceptors: any[] = Reflect.getMetadata(INTERCEPTORS_METADATA, controllerClass) || [];
		const methodInterceptors: any[] = Reflect.getMetadata(INTERCEPTORS_METADATA, handlerFn) || [];
		const interceptors = [...classInterceptors, ...methodInterceptors];

		const classFilters: any[] = Reflect.getMetadata(FILTERS_METADATA, controllerClass) || [];
		const methodFilters: any[] = Reflect.getMetadata(FILTERS_METADATA, handlerFn) || [];
		const filters = [...classFilters, ...methodFilters];

		const httpCode: number | undefined = Reflect.getMetadata(HTTP_CODE_METADATA, handlerFn);
		const defaultStatus = httpCode ?? (route.method === "POST" ? 201 : 200);
		const headersToSet: { name: string; value: string }[] =
			Reflect.getMetadata(HEADER_METADATA, handlerFn) || [];
		const redirectMeta: RedirectMetadata | undefined = Reflect.getMetadata(REDIRECT_METADATA, handlerFn);
		const paramMeta: RouteParamMetadata[] =
			Reflect.getMetadata(ROUTE_PARAMS_METADATA, proto, route.handler) || [];
		const totalParams: number =
			Reflect.getMetadata(TOTAL_PARAMS_METADATA, proto, route.handler) ?? 0;
		const methodMiddlewares: any[] = (handlerFn as any).middlewares || [];

		const bodySchema: any = Reflect.getMetadata(BODY_SCHEMA_METADATA, handlerFn);
		const querySchema: any = Reflect.getMetadata(QUERY_SCHEMA_METADATA, handlerFn);
		const validationRules: ValidationRule[] | undefined = Reflect.getMetadata(
			VALIDATION_RULES_METADATA,
			handlerFn
		);

		const finalHandler = async (c: Context): Promise<Response> => {
			const execCtx = createExecutionContext(c, controllerClass, handlerFn);

			const runCore = async (): Promise<Response> => {
				let cachedBody: any;
				let bodyParsed = false;
				const getBody = async () => {
					if (!bodyParsed) {
						cachedBody = await parseRequestBody(c);
						bodyParsed = true;
					}
					return cachedBody;
				};

				// Validation (pipes) — runs after guards, before the handler
				if (bodySchema) {
					const parsed = bodySchema.safeParse(await getBody());
					if (!parsed.success) {
						return zodErrorResponse(c, parsed.error, "Validation failed");
					}
					cachedBody = parsed.data;
					c.set("validatedData", parsed.data);
				}
				if (querySchema) {
					const parsed = querySchema.safeParse(c.req.query());
					if (!parsed.success) {
						return zodErrorResponse(c, parsed.error, "Query validation failed");
					}
					c.set("validatedQuery", parsed.data);
				}
				if (validationRules?.length) {
					const errors = checkValidationRules(await getBody(), validationRules);
					if (errors.length > 0) {
						return c.json(
							{
								success: false,
								error: {
									code: "VALIDATION_ERROR",
									message: "Validation failed",
									details: errors,
								},
								timestamp: new Date().toISOString(),
							},
							400
						);
					}
				}

				const callHandler = async (): Promise<Response> => {
					let result: any;
					if (paramMeta.length > 0) {
						const args = await resolveParamArgs(paramMeta, c, totalParams, getBody);
						result = await handlerFn.call(controller, ...args);
					} else {
						result = await handlerFn.call(controller, c);
					}

					for (const { name, value } of headersToSet) {
						c.header(name, value);
					}

					if (redirectMeta) {
						const url =
							result && typeof result === "object" && "url" in result
								? (result as any).url
								: redirectMeta.url;
						const code =
							result && typeof result === "object" && "statusCode" in result
								? (result as any).statusCode
								: redirectMeta.statusCode;
						return c.redirect(url, code as any);
					}

					// Auto-serialize non-Response returns
					if (result instanceof Response) return result;
					if (result !== undefined && result !== null) {
						return c.json(result, defaultStatus as any);
					}
					return new Response(null, { status: httpCode ?? 204 });
				};

				// Method-level legacy middlewares
				if (methodMiddlewares.length > 0) {
					let idx = 0;
					const next = async (): Promise<Response | void> => {
						if (idx < methodMiddlewares.length) {
							return await methodMiddlewares[idx++](c, next);
						}
						return callHandler();
					};
					return (await next()) as Response;
				}

				return callHandler();
			};

			const runPipeline = async (): Promise<Response> => {
				// Guards run before interceptors, mirroring NestJS
				for (const G of guards) {
					const guard = resolveEnhancer(G, diCtx);
					const ok = await guard.canActivate(execCtx);
					if (!ok) throw new ForbiddenException();
				}

				if (interceptors.length === 0) return runCore();

				let chain = runCore;
				for (let i = interceptors.length - 1; i >= 0; i--) {
					const interceptor = resolveEnhancer(interceptors[i], diCtx);
					const inner = chain;
					chain = () => interceptor.intercept(execCtx, { handle: inner });
				}
				return chain();
			};

			// Exception filters wrap everything
			if (filters.length === 0) return runPipeline();

			try {
				return await runPipeline();
			} catch (err) {
				for (const F of filters) {
					const filter = resolveEnhancer(F, diCtx);
					const catchTypes: any[] =
						Reflect.getMetadata(CATCH_METADATA, filter.constructor ?? F) || [];
					if (catchTypes.length === 0 || catchTypes.some((T) => err instanceof T)) {
						const host = createArgumentsHost(c);
						const res = await filter.catch(err, host);
						if (res instanceof Response) return res;
					}
				}
				throw err;
			}
		};

		switch (route.method) {
			case "GET":    router.get(fullPath, finalHandler);    break;
			case "POST":   router.post(fullPath, finalHandler);   break;
			case "PUT":    router.put(fullPath, finalHandler);    break;
			case "DELETE": router.delete(fullPath, finalHandler); break;
			case "PATCH":  router.patch(fullPath, finalHandler);  break;
		}
	}
}
