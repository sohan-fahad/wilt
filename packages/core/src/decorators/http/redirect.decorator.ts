export const REDIRECT_METADATA = "wilt:redirect";

export interface RedirectMetadata {
	url: string;
	statusCode: number;
}

export function Redirect(url: string, statusCode: number = 302): MethodDecorator {
	return (_target, _key, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata(REDIRECT_METADATA, { url, statusCode }, descriptor.value);
		return descriptor;
	};
}
