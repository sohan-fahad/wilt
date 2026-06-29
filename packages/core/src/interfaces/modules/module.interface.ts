export interface ForwardReference<T = any> {
	forwardRef: () => T;
}

export type Type<T = any> = new (...args: any[]) => T;

export type InjectionToken<T = any> = string | symbol | Type<T>;

export interface ClassProvider<T = any> {
	provide: InjectionToken<T>;
	useClass: Type<T>;
}

export interface ValueProvider<T = any> {
	provide: InjectionToken<T>;
	useValue: T;
}

export interface FactoryProvider<T = any> {
	provide: InjectionToken<T>;
	useFactory: (...args: any[]) => T;
	inject?: Array<InjectionToken | ForwardReference>;
}

export interface ExistingProvider<T = any> {
	provide: InjectionToken<T>;
	useExisting: InjectionToken;
}

export type Provider<T = any> =
	| Type<T>
	| ClassProvider<T>
	| ValueProvider<T>
	| FactoryProvider<T>
	| ExistingProvider<T>;

export interface ModuleMetadata {
	imports?: Array<Type | DynamicModule | ForwardReference>;
	controllers?: Type[];
	providers?: Provider[];
	exports?: Array<InjectionToken | ForwardReference>;
	entities?: any[];
}

export interface DynamicModule extends ModuleMetadata {
	module: Type;
	global?: boolean;
}

export interface RouteMetadata {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	path: string;
	handler: string;
}
