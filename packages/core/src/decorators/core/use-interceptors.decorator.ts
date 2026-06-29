export const INTERCEPTORS_METADATA = "wilt:interceptors";

export function UseInterceptors(
	...interceptors: (new (...args: any[]) => any)[]
): MethodDecorator & ClassDecorator {
	return (target: any, key?: any, descriptor?: PropertyDescriptor): any => {
		if (descriptor) {
			const existing: any[] = Reflect.getMetadata(INTERCEPTORS_METADATA, descriptor.value) || [];
			Reflect.defineMetadata(INTERCEPTORS_METADATA, [...existing, ...interceptors], descriptor.value);
			return descriptor;
		}
		const existing: any[] = Reflect.getMetadata(INTERCEPTORS_METADATA, target) || [];
		Reflect.defineMetadata(INTERCEPTORS_METADATA, [...existing, ...interceptors], target);
		return target;
	};
}
