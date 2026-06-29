import "reflect-metadata";
import { describe, it, expect } from "vitest";
import {
	Module,
	Global,
	Injectable,
	Inject,
	Optional,
	forwardRef,
	createModule,
	compileModuleTree,
	createResolutionContext,
	resolveToken,
	type DynamicModule,
} from "../src";

function resolveAll(rootModule: any) {
	const tree = compileModuleTree(rootModule);
	const ctx = createResolutionContext(tree.providers);
	for (const token of tree.tokens) resolveToken(token, ctx);
	return ctx;
}

describe("dependency injection", () => {
	it("resolves class providers and injects them by token", () => {
		@Injectable()
		class ServiceA {
			value = "a";
		}

		@Injectable()
		class ServiceB {
			constructor(@Inject(ServiceA) public a: ServiceA) {}
		}

		@Module({ providers: [ServiceA, ServiceB] })
		class AppModule {}

		const ctx = resolveAll(AppModule);
		const b = ctx.registry.get(ServiceB) as ServiceB;
		expect(b.a).toBeInstanceOf(ServiceA);
		expect(b.a.value).toBe("a");
	});

	it("supports useValue, useFactory, useClass and useExisting providers", () => {
		const CONFIG = "APP_CONFIG";

		@Injectable()
		class Impl {
			kind = "impl";
		}

		@Injectable()
		class Consumer {
			constructor(
				@Inject(CONFIG) public config: { url: string },
				@Inject("FACTORY_MADE") public made: string,
				@Inject("ABSTRACT") public impl: Impl,
				@Inject("ALIAS") public alias: Impl
			) {}
		}

		@Module({
			providers: [
				{ provide: CONFIG, useValue: { url: "https://example.com" } },
				{ provide: "FACTORY_MADE", useFactory: (cfg: { url: string }) => `made:${cfg.url}`, inject: [CONFIG] },
				{ provide: "ABSTRACT", useClass: Impl },
				{ provide: "ALIAS", useExisting: "ABSTRACT" },
				Consumer,
			],
		})
		class AppModule {}

		const ctx = resolveAll(AppModule);
		const consumer = ctx.registry.get(Consumer) as Consumer;
		expect(consumer.config.url).toBe("https://example.com");
		expect(consumer.made).toBe("made:https://example.com");
		expect(consumer.impl).toBeInstanceOf(Impl);
		expect(consumer.alias).toBe(consumer.impl);
	});

	it("throws a clear error for unknown string tokens", () => {
		@Injectable()
		class NeedsMissing {
			constructor(@Inject("MISSING") public dep: unknown) {}
		}

		@Module({ providers: [NeedsMissing] })
		class AppModule {}

		expect(() => resolveAll(AppModule)).toThrow(/No provider found for token "MISSING"/);
	});

	it("injects undefined for @Optional() missing dependencies", () => {
		@Injectable()
		class NeedsOptional {
			constructor(@Optional() @Inject("MISSING") public dep: unknown) {}
		}

		@Module({ providers: [NeedsOptional] })
		class AppModule {}

		const ctx = resolveAll(AppModule);
		expect((ctx.registry.get(NeedsOptional) as NeedsOptional).dep).toBeUndefined();
	});

	it("resolves circular provider dependencies via forwardRef", () => {
		@Injectable()
		class ChickenService {
			constructor(@Inject(forwardRef(() => EggService)) public egg: any) {}
			name() {
				return "chicken";
			}
			describeOther() {
				return `chicken knows ${this.egg.name()}`;
			}
		}

		@Injectable()
		class EggService {
			constructor(@Inject(forwardRef(() => ChickenService)) public chicken: any) {}
			name() {
				return "egg";
			}
			describeOther() {
				return `egg knows ${this.chicken.name()}`;
			}
		}

		@Module({ providers: [ChickenService, EggService] })
		class AppModule {}

		const ctx = resolveAll(AppModule);
		const chicken = ctx.registry.get(ChickenService) as ChickenService;
		const egg = ctx.registry.get(EggService) as EggService;
		expect(chicken.describeOther()).toBe("chicken knows egg");
		expect(egg.describeOther()).toBe("egg knows chicken");
	});

	it("does not leave a failed resolution stuck in progress", () => {
		let attempts = 0;

		@Injectable()
		class Flaky {
			constructor() {
				attempts++;
				if (attempts === 1) throw new Error("boom");
			}
		}

		const ctx = createResolutionContext(new Map([[Flaky, Flaky]]));
		expect(() => resolveToken(Flaky, ctx)).toThrow("boom");
		// Second attempt must construct again instead of returning a circular proxy
		expect(resolveToken(Flaky, ctx)).toBeInstanceOf(Flaky);
	});
});

describe("module graph", () => {
	it("resolves circular module imports when both sides use forwardRef", () => {
		@Injectable()
		class AService {}

		@Injectable()
		class BService {}

		@Module({ imports: [forwardRef(() => BModule)], providers: [AService] })
		class AModule {}

		@Module({ imports: [forwardRef(() => AModule)], providers: [BService] })
		class BModule {}

		const tree = compileModuleTree(AModule);
		expect(tree.providers.has(AService)).toBe(true);
		expect(tree.providers.has(BService)).toBe(true);
	});

	it("throws on circular module imports without forwardRef", () => {
		@Module({ imports: [] })
		class AModule {}

		@Module({ imports: [AModule] })
		class BModule {}

		(AModule.prototype as any).moduleConfig.imports.push(BModule);

		expect(() => compileModuleTree(AModule)).toThrow(/Circular module dependency/);
	});

	it("collects providers from @Global modules first", () => {
		@Injectable()
		class GlobalService {}

		@Injectable()
		class LocalService {}

		@Global()
		@Module({ providers: [GlobalService] })
		class SharedModule {}

		@Module({ imports: [SharedModule], providers: [LocalService] })
		class AppModule {}

		const tree = compileModuleTree(AppModule);
		expect(tree.globalTokens).toContain(GlobalService);
		expect(tree.tokens).toContain(LocalService);
	});

	it("supports dynamic modules (forRoot pattern)", () => {
		@Injectable()
		class DynamicService {}

		@Module({})
		class ConfigurableModule {
			static forRoot(value: string): DynamicModule {
				return {
					module: ConfigurableModule,
					providers: [{ provide: "DYNAMIC_VALUE", useValue: value }, DynamicService],
					global: true,
				};
			}
		}

		@Module({ imports: [ConfigurableModule.forRoot("hello")] })
		class AppModule {}

		const tree = compileModuleTree(AppModule);
		const ctx = createResolutionContext(tree.providers);
		expect(resolveToken("DYNAMIC_VALUE", ctx)).toBe("hello");
		expect(resolveToken(DynamicService, ctx)).toBeInstanceOf(DynamicService);
		expect(tree.globalTokens).toContain("DYNAMIC_VALUE");
	});

	it("rejects classes that are not decorated with @Module", () => {
		class NotAModule {}

		expect(() => compileModuleTree(NotAModule)).toThrow(/not a module/);
	});

	it("calls onModuleInit on instantiated providers", () => {
		const calls: string[] = [];

		@Injectable()
		class WithInit {
			onModuleInit() {
				calls.push("init");
			}
			onApplicationBootstrap() {
				calls.push("bootstrap");
			}
		}

		@Module({ providers: [WithInit] })
		class AppModule {}

		createModule(AppModule);
		expect(calls).toEqual(["init", "bootstrap"]);
	});
});
