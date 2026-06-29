import { Hono } from "hono";
import { registerControllerRoutes } from "../decorators/http/controller.decorator";
import { Reflector } from "../services/reflector.service";
import { logger } from "../utils/logger.util";
import { compileModuleTree } from "./module-compiler";
import { createResolutionContext, resolveToken, tokenName } from "./injector";

export function createModule<B extends object = Record<string, unknown>>(
	moduleClass: any,
	{ middlewares = [] }: { middlewares?: any[] } = {}
): Hono<{ Bindings: B }> {
	const router = new Hono<{ Bindings: B }>();

	logger.info(`Creating module: ${moduleClass.name}`, "ModuleFactory");

	middlewares.forEach((middleware) => router.use("*", middleware));

	const tree = compileModuleTree(moduleClass);

	logger.info(
		`Resolved ${tree.providers.size} providers, ${tree.controllers.length} controllers`,
		"ModuleFactory"
	);

	const ctx = createResolutionContext(tree.providers);
	ctx.registry.set(Reflector, new Reflector());

	// Global providers are resolved first so they're available to all modules
	for (const token of tree.globalTokens) {
		resolveToken(token, ctx);
	}

	for (const token of tree.tokens) {
		try {
			resolveToken(token, ctx);
		} catch (error) {
			logger.error(
				`Failed to create provider "${tokenName(token)}": ${error}`,
				"ModuleFactory"
			);
			throw error;
		}
	}

	for (const ControllerClass of tree.controllers) {
		try {
			const controller = resolveToken(ControllerClass, ctx);
			const prefix = ControllerClass.prototype.prefix || "";
			registerControllerRoutes(router, controller, prefix, ctx);
			logger.debug(
				`Registered controller: ${ControllerClass.name} at "${prefix}"`,
				"ModuleFactory"
			);
		} catch (error) {
			logger.error(
				`Failed to create controller "${ControllerClass.name}": ${error}`,
				"ModuleFactory"
			);
			throw error;
		}
	}

	runLifecycleHook(ctx.registry.values(), "onModuleInit");
	runLifecycleHook(ctx.registry.values(), "onApplicationBootstrap");

	logger.info(`Module "${moduleClass.name}" created successfully`, "ModuleFactory");
	return router;
}

function runLifecycleHook(instances: Iterable<any>, hook: string): void {
	const seen = new Set<any>();
	for (const instance of instances) {
		if (!instance || seen.has(instance)) continue;
		seen.add(instance);
		if (typeof instance[hook] !== "function") continue;
		const result = instance[hook]();
		if (result instanceof Promise) {
			result.catch((err) =>
				logger.error(`${hook} failed for ${instance.constructor?.name}: ${err}`, "ModuleFactory")
			);
		}
	}
}
