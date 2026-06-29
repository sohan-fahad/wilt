import { Injectable } from "../decorators/core/injectable.decorator";

@Injectable()
export class Reflector {
	get<T = any>(metadataKey: string, target: Function): T {
		return Reflect.getMetadata(metadataKey, target) as T;
	}

	getAllAndOverride<T = any>(metadataKey: string, targets: Function[]): T {
		for (const target of targets) {
			const value = Reflect.getMetadata(metadataKey, target);
			if (value !== undefined) return value as T;
		}
		return undefined as unknown as T;
	}

	getAllAndMerge<T extends any[] = any[]>(metadataKey: string, targets: Function[]): T {
		return targets.reduce<any[]>((acc, target) => {
			const value = Reflect.getMetadata(metadataKey, target);
			if (Array.isArray(value)) return [...acc, ...value];
			return acc;
		}, []) as T;
	}
}
