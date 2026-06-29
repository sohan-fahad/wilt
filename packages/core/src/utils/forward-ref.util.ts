import type { ForwardReference } from "../interfaces/modules/module.interface";

export function forwardRef<T = any>(fn: () => T): ForwardReference<T> {
	return { forwardRef: fn };
}

export function isForwardRef(val: any): val is ForwardReference {
	return (
		val !== null &&
		val !== undefined &&
		typeof val === "object" &&
		typeof val.forwardRef === "function"
	);
}
