export const OPTIONAL_METADATA = "wilt:optional";

export function Optional(): ParameterDecorator {
	return (target, _key, parameterIndex) => {
		const existing: number[] = [
			...(Reflect.getOwnMetadata(OPTIONAL_METADATA, target) ??
				Reflect.getMetadata(OPTIONAL_METADATA, target) ??
				[]),
		];
		existing.push(parameterIndex);
		Reflect.defineMetadata(OPTIONAL_METADATA, existing, target);
	};
}
