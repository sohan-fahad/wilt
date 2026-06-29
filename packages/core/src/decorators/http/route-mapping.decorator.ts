import type { RouteMetadata } from "../../interfaces/modules/module.interface";

function createMethodDecorator(
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
) {
	return (path: string = "") =>
		(target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
			const proto = target.constructor.prototype;
			// Clone inherited routes so subclasses don't mutate their parent's array
			if (!Object.prototype.hasOwnProperty.call(proto, "routes")) {
				proto.routes = [...(proto.routes ?? [])];
			}
			(proto.routes as RouteMetadata[]).push({
				method,
				path,
				handler: propertyKey,
			});
			return descriptor;
		};
}

export const Get = createMethodDecorator("GET");
export const Post = createMethodDecorator("POST");
export const Put = createMethodDecorator("PUT");
export const Delete = createMethodDecorator("DELETE");
export const Patch = createMethodDecorator("PATCH");
