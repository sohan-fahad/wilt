import { GLOBAL_MODULE_METADATA } from "../decorators/modules/global.decorator";
import { isForwardRef } from "../utils/forward-ref.util";
import type {
	DynamicModule,
	InjectionToken,
	ModuleMetadata,
	Provider,
	Type,
} from "../interfaces/modules/module.interface";

export interface CompiledModuleTree {
	controllers: Type[];
	providers: Map<InjectionToken, Provider>;
	/** Tokens from @Global() / { global: true } modules — instantiated first. */
	globalTokens: InjectionToken[];
	/** All provider tokens in discovery order, for eager instantiation. */
	tokens: InjectionToken[];
}

export function providerToken(provider: Provider): InjectionToken {
	return typeof provider === "function" ? provider : provider.provide;
}

function isDynamicModule(ref: any): ref is DynamicModule {
	return ref !== null && typeof ref === "object" && typeof ref.module === "function";
}

interface NormalizedModule {
	moduleClass: Type;
	config: ModuleMetadata;
	isGlobal: boolean;
}

function normalizeModule(ref: any): NormalizedModule {
	if (isDynamicModule(ref)) {
		const moduleClass = ref.module;
		const decorated: ModuleMetadata = moduleClass.prototype?.moduleConfig ?? {};
		return {
			moduleClass,
			config: {
				imports: [...(decorated.imports ?? []), ...(ref.imports ?? [])],
				controllers: [...(decorated.controllers ?? []), ...(ref.controllers ?? [])],
				providers: [...(decorated.providers ?? []), ...(ref.providers ?? [])],
				exports: [...(decorated.exports ?? []), ...(ref.exports ?? [])],
			},
			isGlobal:
				ref.global === true ||
				Reflect.getMetadata(GLOBAL_MODULE_METADATA, moduleClass) === true,
		};
	}

	if (typeof ref !== "function") {
		throw new Error(
			`[Wilt] Invalid module reference: ${String(ref)}. ` +
				`Expected a class decorated with @Module() or a dynamic module ({ module, providers, ... }).`
		);
	}

	const config: ModuleMetadata | undefined = ref.prototype?.moduleConfig;
	if (!config) {
		throw new Error(`[Wilt] "${ref.name}" is not a module. Did you forget the @Module() decorator?`);
	}

	return {
		moduleClass: ref,
		config,
		isGlobal: Reflect.getMetadata(GLOBAL_MODULE_METADATA, ref) === true,
	};
}

export function compileModuleTree(rootModule: any): CompiledModuleTree {
	const tree: CompiledModuleTree = {
		controllers: [],
		providers: new Map(),
		globalTokens: [],
		tokens: [],
	};
	collect(rootModule, new Set(), new Set(), tree);
	return tree;
}

function collect(
	moduleRef: any,
	visiting: Set<Type>,
	visited: Set<Type>,
	tree: CompiledModuleTree
): void {
	const { moduleClass, config, isGlobal } = normalizeModule(
		isForwardRef(moduleRef) ? moduleRef.forwardRef() : moduleRef
	);

	if (visited.has(moduleClass)) return;
	visiting.add(moduleClass);

	for (const controller of config.controllers ?? []) {
		if (!tree.controllers.includes(controller)) tree.controllers.push(controller);
	}

	for (const provider of config.providers ?? []) {
		const token = providerToken(provider);
		if (!tree.providers.has(token)) {
			tree.providers.set(token, provider);
			tree.tokens.push(token);
		}
		if (isGlobal && !tree.globalTokens.includes(token)) {
			tree.globalTokens.push(token);
		}
	}

	for (const importRef of config.imports ?? []) {
		const isRef = isForwardRef(importRef);
		const resolved = isRef ? importRef.forwardRef() : importRef;
		const importedClass: Type = isDynamicModule(resolved) ? resolved.module : resolved;

		if (visiting.has(importedClass)) {
			if (!isRef) {
				throw new Error(
					`[Wilt] Circular module dependency detected: "${moduleClass.name}" imports ` +
						`"${importedClass.name}" without forwardRef. Wrap it with ` +
						`forwardRef(() => ${importedClass.name}) in "${moduleClass.name}", ` +
						`and do the same in "${importedClass.name}".`
				);
			}
			continue;
		}

		collect(resolved, visiting, visited, tree);
	}

	visiting.delete(moduleClass);
	visited.add(moduleClass);
}
