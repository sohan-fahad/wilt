import type { ExecutionContext } from "../../context/execution-context";

export interface CallHandler<T = any> {
	handle(): Promise<T>;
}

export interface NestInterceptor<T = any, R = any> {
	intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R>;
}
