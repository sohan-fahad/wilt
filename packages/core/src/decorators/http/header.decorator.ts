export const HEADER_METADATA = "wilt:response-headers";

export function Header(name: string, value: string): MethodDecorator {
	return (_target, _key, descriptor: PropertyDescriptor) => {
		const existing: { name: string; value: string }[] =
			Reflect.getMetadata(HEADER_METADATA, descriptor.value) || [];
		existing.push({ name, value });
		Reflect.defineMetadata(HEADER_METADATA, existing, descriptor.value);
		return descriptor;
	};
}
