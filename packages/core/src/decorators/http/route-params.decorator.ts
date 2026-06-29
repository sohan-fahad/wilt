export const ROUTE_PARAMS_METADATA = "wilt:route-params";
export const TOTAL_PARAMS_METADATA = "wilt:total-params";

export type RouteParamType = "body" | "param" | "query" | "headers" | "ip" | "req";

export interface RouteParamMetadata {
	index: number;
	type: RouteParamType;
	data?: string;
}

function recordTotalParams(target: any, key: string) {
	if (!Reflect.hasMetadata(TOTAL_PARAMS_METADATA, target, key)) {
		const fn = target[key];
		if (typeof fn === "function") {
			Reflect.defineMetadata(TOTAL_PARAMS_METADATA, fn.length, target, key);
		}
	}
}

function createParamDecorator(type: RouteParamType) {
	return (data?: string): ParameterDecorator =>
		(target, propertyKey, parameterIndex) => {
			const key = propertyKey as string;
			const existing: RouteParamMetadata[] =
				Reflect.getMetadata(ROUTE_PARAMS_METADATA, target, key) || [];
			existing.push({ index: parameterIndex, type, data });
			Reflect.defineMetadata(ROUTE_PARAMS_METADATA, existing, target, key);
			recordTotalParams(target, key);
		};
}

export const Body = createParamDecorator("body");
export const Param = createParamDecorator("param");
export const Query = createParamDecorator("query");
export const Headers = createParamDecorator("headers");

export function Ip(): ParameterDecorator {
	return (target, propertyKey, parameterIndex) => {
		const key = propertyKey as string;
		const existing: RouteParamMetadata[] =
			Reflect.getMetadata(ROUTE_PARAMS_METADATA, target, key) || [];
		existing.push({ index: parameterIndex, type: "ip" });
		Reflect.defineMetadata(ROUTE_PARAMS_METADATA, existing, target, key);
		recordTotalParams(target, key);
	};
}

export function Req(): ParameterDecorator {
	return (target, propertyKey, parameterIndex) => {
		const key = propertyKey as string;
		const existing: RouteParamMetadata[] =
			Reflect.getMetadata(ROUTE_PARAMS_METADATA, target, key) || [];
		existing.push({ index: parameterIndex, type: "req" });
		Reflect.defineMetadata(ROUTE_PARAMS_METADATA, existing, target, key);
		recordTotalParams(target, key);
	};
}

export { Req as Request };
