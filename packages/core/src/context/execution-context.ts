import type { Context } from "hono";

export interface HttpArgumentsHost {
	getRequest<T = Context>(): T;
}

export interface ArgumentsHost {
	switchToHttp(): HttpArgumentsHost;
}

export interface ExecutionContext extends ArgumentsHost {
	getClass<T = any>(): new (...args: any[]) => T;
	getHandler(): Function;
}

export function createExecutionContext(
	c: Context,
	controllerClass: any,
	handler: Function
): ExecutionContext {
	return {
		getClass: () => controllerClass,
		getHandler: () => handler,
		switchToHttp: () => ({
			getRequest: <T = Context>() => c as unknown as T,
		}),
	};
}

export function createArgumentsHost(c: Context): ArgumentsHost {
	return {
		switchToHttp: () => ({
			getRequest: <T = Context>() => c as unknown as T,
		}),
	};
}
