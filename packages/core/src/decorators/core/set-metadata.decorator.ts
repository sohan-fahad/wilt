export interface CustomDecorator<TKey = string> {
	(target: any, key?: any, descriptor?: any): any;
	KEY: TKey;
}

export function SetMetadata<K = string, V = any>(
	metadataKey: K,
	metadataValue: V
): CustomDecorator<K> {
	const decoratorFactory = (target: any, key?: any, descriptor?: PropertyDescriptor): any => {
		if (descriptor) {
			Reflect.defineMetadata(metadataKey as string, metadataValue, descriptor.value);
			return descriptor;
		}
		Reflect.defineMetadata(metadataKey as string, metadataValue, target);
		return target;
	};
	(decoratorFactory as any).KEY = metadataKey;
	return decoratorFactory as CustomDecorator<K>;
}
