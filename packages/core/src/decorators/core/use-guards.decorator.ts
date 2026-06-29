export const GUARDS_METADATA = "wilt:guards";

export function UseGuards(...guards: (new (...args: any[]) => any)[]): MethodDecorator & ClassDecorator {
	return (target: any, key?: any, descriptor?: PropertyDescriptor): any => {
		if (descriptor) {
			const existing: any[] = Reflect.getMetadata(GUARDS_METADATA, descriptor.value) || [];
			Reflect.defineMetadata(GUARDS_METADATA, [...existing, ...guards], descriptor.value);
			return descriptor;
		}
		const existing: any[] = Reflect.getMetadata(GUARDS_METADATA, target) || [];
		Reflect.defineMetadata(GUARDS_METADATA, [...existing, ...guards], target);
		return target;
	};
}
