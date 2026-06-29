export const GLOBAL_MODULE_METADATA = "wilt:global";

export function Global(): ClassDecorator {
	return (target: any) => {
		Reflect.defineMetadata(GLOBAL_MODULE_METADATA, true, target);
		return target;
	};
}
