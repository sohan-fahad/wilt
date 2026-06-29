import type {
	ForwardReference,
	InjectionToken,
} from "../../interfaces/modules/module.interface";

export const INJECTABLE_METADATA = "wilt:injectable";
export const INJECT_CUSTOM_TOKENS_KEY = "wilt:inject:custom:tokens";

export function Injectable(): ClassDecorator {
	return (target: any) => {
		Reflect.defineMetadata(INJECTABLE_METADATA, true, target);
		return target;
	};
}

/**
 * Marks a constructor parameter for injection.
 *
 * Accepts a class, a string/symbol token, or `forwardRef(() => TheClass)`
 * for circular dependencies. An explicit token is required when the project
 * is bundled with esbuild/Vite, which never emit `design:paramtypes`.
 */
export function Inject(token?: InjectionToken | ForwardReference) {
	return (
		target: any,
		propertyKey: string | symbol | undefined,
		parameterIndex: number
	) => {
		if (propertyKey !== undefined) return;

		let actualToken: InjectionToken | ForwardReference | undefined = token;
		if (actualToken === undefined || actualToken === null) {
			const paramTypes = Reflect.getMetadata("design:paramtypes", target) || [];
			actualToken = paramTypes[parameterIndex];
		}
		if (actualToken === undefined || actualToken === null) return;

		const existing: Record<number, InjectionToken | ForwardReference> = {
			...(Reflect.getOwnMetadata(INJECT_CUSTOM_TOKENS_KEY, target) ??
				Reflect.getMetadata(INJECT_CUSTOM_TOKENS_KEY, target) ??
				{}),
		};
		existing[parameterIndex] = actualToken;
		Reflect.defineMetadata(INJECT_CUSTOM_TOKENS_KEY, existing, target);
	};
}
