export class HttpException extends Error {
	constructor(
		private readonly response: string | Record<string, any>,
		private readonly statusCode: number
	) {
		super(typeof response === "string" ? response : (response as any).message ?? "HttpException");
		this.name = "HttpException";
	}

	getStatus(): number {
		return this.statusCode;
	}

	getResponse(): string | Record<string, any> {
		return this.response;
	}
}
