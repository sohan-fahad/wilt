import { INJECT_CUSTOM_TOKENS_KEY } from "../decorators/core/injectable.decorator";
import { OPTIONAL_METADATA } from "../decorators/core/optional.decorator";
import { isForwardRef } from "../utils/forward-ref.util";
import { logger } from "../utils/logger.util";
import type {
	ForwardReference,
	InjectionToken,
	Provider,
	Type,
} from "../interfaces/modules/module.interface";

export interface ResolutionContext {
	/** Singleton instances, keyed by injection token. */
	registry: Map<InjectionToken, any>;
	/** Provider definitions collected from the module tree. */
	providers: Map<InjectionToken, Provider>;
	/** Tokens currently being constructed (circular-dependency detection). */
	inProgress: Set<InjectionToken>;
}

export function createResolutionContext(
	providers: Map<InjectionToken, Provider> = new Map()
): ResolutionContext {
	return { registry: new Map(), providers, inProgress: new Set() };
}

export function tokenName(token: InjectionToken | ForwardReference): string {
	if (isForwardRef(token)) return "forwardRef()";
	return typeof token === "function" ? token.name : String(token);
}

function createCircularProxy(registry: Map<InjectionToken, any>, token: InjectionToken): any {
	const resolve = () => {
		const instance = registry.get(token);
		if (instance === undefined) {
			throw new Error(
				`[Wilt DI] Circular dependency proxy for "${tokenName(token)}" ` +
					`was accessed before the real instance was created. ` +
					`Avoid using the dependency inside the constructor; ` +
					`make sure both sides use @Inject(forwardRef(() => ...)).`
			);
		}
		return instance;
	};
	return new Proxy(
		{},
		{
			get(_target, prop) {
				const instance = resolve();
				const val = instance[prop];
				return typeof val === "function" ? val.bind(instance) : val;
			},
			set(_target, prop, value) {
				resolve()[prop] = value;
				return true;
			},
			has(_target, prop) {
				return prop in resolve();
			},
		}
	);
}

export function resolveToken(
	token: InjectionToken | ForwardReference,
	ctx: ResolutionContext
): any {
	const actualToken: InjectionToken = isForwardRef(token) ? token.forwardRef() : token;

	if (ctx.registry.has(actualToken)) {
		return ctx.registry.get(actualToken);
	}

	if (ctx.inProgress.has(actualToken)) {
		logger.warn(
			`Circular dependency detected for "${tokenName(actualToken)}". ` +
				`Injecting a lazy proxy — ensure forwardRef() is used on both sides.`,
			"Injector"
		);
		return createCircularProxy(ctx.registry, actualToken);
	}

	ctx.inProgress.add(actualToken);
	try {
		const definition = ctx.providers.get(actualToken);
		let instance: any;

		if (definition === undefined || definition === actualToken) {
			if (typeof actualToken !== "function") {
				throw new Error(
					`[Wilt DI] No provider found for token "${tokenName(actualToken)}". ` +
						`Register it in a module's providers array, e.g. ` +
						`{ provide: ${JSON.stringify(String(actualToken))}, useValue: ... }.`
				);
			}
			instance = construct(actualToken, ctx);
		} else if ("useValue" in definition) {
			instance = definition.useValue;
		} else if ("useFactory" in definition) {
			const deps = (definition.inject ?? []).map((dep) => resolveToken(dep, ctx));
			instance = definition.useFactory(...deps);
			if (instance instanceof Promise) {
				throw new Error(
					`[Wilt DI] Async factory for "${tokenName(actualToken)}" is not supported: ` +
						`modules are created synchronously at Worker startup. ` +
						`Resolve the value lazily inside the provider instead.`
				);
			}
		} else if ("useClass" in definition) {
			instance = construct(definition.useClass, ctx);
		} else if ("useExisting" in definition) {
			instance = resolveToken(definition.useExisting, ctx);
		} else {
			throw new Error(
				`[Wilt DI] Invalid provider for token "${tokenName(actualToken)}": ` +
					`expected a class or { provide, useValue | useClass | useFactory | useExisting }.`
			);
		}

		ctx.registry.set(actualToken, instance);
		return instance;
	} finally {
		ctx.inProgress.delete(actualToken);
	}
}

function construct(ProviderClass: Type, ctx: ResolutionContext): any {
	const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", ProviderClass) || [];
	const customTokens: Record<number, any> =
		Reflect.getOwnMetadata(INJECT_CUSTOM_TOKENS_KEY, ProviderClass) ||
		Reflect.getMetadata(INJECT_CUSTOM_TOKENS_KEY, ProviderClass) ||
		{};
	const optionalIndices: number[] = Reflect.getMetadata(OPTIONAL_METADATA, ProviderClass) || [];

	const customIndices = Object.keys(customTokens).map(Number);
	const paramCount = Math.max(
		paramTypes.length,
		customIndices.length > 0 ? Math.max(...customIndices) + 1 : 0
	);

	const deps = Array.from({ length: paramCount }, (_, i) => {
		const token = customTokens[i] ?? paramTypes[i];
		const isOptional = optionalIndices.includes(i);

		if (!token || token === Object || token === Function) {
			if (!isOptional) {
				logger.warn(
					`Cannot resolve param[${i}] for "${ProviderClass.name}": no type info. ` +
						`Use @Inject(TheToken) to specify it explicitly.`,
					"Injector"
				);
			}
			return undefined;
		}

		try {
			return resolveToken(token, ctx);
		} catch (err) {
			if (isOptional) return undefined;
			throw err;
		}
	});

	const instance = new ProviderClass(...deps);
	logger.debug(`Created instance: ${ProviderClass.name}`, "Injector");
	return instance;
}

/**
 * Resolves a class to a singleton instance using a plain instance map.
 * Kept for backward compatibility with the pre-token-based API.
 */
export function resolveInstance(
	ProviderClass: any,
	instanceRegistry: Map<any, any>,
	inProgress: Set<any> = new Set()
): any {
	const ctx: ResolutionContext = {
		registry: instanceRegistry,
		providers: new Map(),
		inProgress,
	};
	return resolveToken(ProviderClass, ctx);
}
