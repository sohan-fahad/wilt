import { HttpException } from "./http-exception";

export class BadRequestException extends HttpException {
	constructor(message: string | Record<string, any> = "Bad Request") {
		super(message, 400);
		this.name = "BadRequestException";
	}
}

export class UnauthorizedException extends HttpException {
	constructor(message: string | Record<string, any> = "Unauthorized") {
		super(message, 401);
		this.name = "UnauthorizedException";
	}
}

export class ForbiddenException extends HttpException {
	constructor(message: string | Record<string, any> = "Forbidden") {
		super(message, 403);
		this.name = "ForbiddenException";
	}
}

export class NotFoundException extends HttpException {
	constructor(message: string | Record<string, any> = "Not Found") {
		super(message, 404);
		this.name = "NotFoundException";
	}
}

export class MethodNotAllowedException extends HttpException {
	constructor(message: string | Record<string, any> = "Method Not Allowed") {
		super(message, 405);
		this.name = "MethodNotAllowedException";
	}
}

export class NotAcceptableException extends HttpException {
	constructor(message: string | Record<string, any> = "Not Acceptable") {
		super(message, 406);
		this.name = "NotAcceptableException";
	}
}

export class RequestTimeoutException extends HttpException {
	constructor(message: string | Record<string, any> = "Request Timeout") {
		super(message, 408);
		this.name = "RequestTimeoutException";
	}
}

export class ConflictException extends HttpException {
	constructor(message: string | Record<string, any> = "Conflict") {
		super(message, 409);
		this.name = "ConflictException";
	}
}

export class GoneException extends HttpException {
	constructor(message: string | Record<string, any> = "Gone") {
		super(message, 410);
		this.name = "GoneException";
	}
}

export class PreconditionFailedException extends HttpException {
	constructor(message: string | Record<string, any> = "Precondition Failed") {
		super(message, 412);
		this.name = "PreconditionFailedException";
	}
}

export class PayloadTooLargeException extends HttpException {
	constructor(message: string | Record<string, any> = "Payload Too Large") {
		super(message, 413);
		this.name = "PayloadTooLargeException";
	}
}

export class UnsupportedMediaTypeException extends HttpException {
	constructor(message: string | Record<string, any> = "Unsupported Media Type") {
		super(message, 415);
		this.name = "UnsupportedMediaTypeException";
	}
}

export class UnprocessableEntityException extends HttpException {
	constructor(message: string | Record<string, any> = "Unprocessable Entity") {
		super(message, 422);
		this.name = "UnprocessableEntityException";
	}
}

export class TooManyRequestsException extends HttpException {
	constructor(message: string | Record<string, any> = "Too Many Requests") {
		super(message, 429);
		this.name = "TooManyRequestsException";
	}
}

export class InternalServerErrorException extends HttpException {
	constructor(message: string | Record<string, any> = "Internal Server Error") {
		super(message, 500);
		this.name = "InternalServerErrorException";
	}
}

export class NotImplementedException extends HttpException {
	constructor(message: string | Record<string, any> = "Not Implemented") {
		super(message, 501);
		this.name = "NotImplementedException";
	}
}

export class BadGatewayException extends HttpException {
	constructor(message: string | Record<string, any> = "Bad Gateway") {
		super(message, 502);
		this.name = "BadGatewayException";
	}
}

export class ServiceUnavailableException extends HttpException {
	constructor(message: string | Record<string, any> = "Service Unavailable") {
		super(message, 503);
		this.name = "ServiceUnavailableException";
	}
}

export class GatewayTimeoutException extends HttpException {
	constructor(message: string | Record<string, any> = "Gateway Timeout") {
		super(message, 504);
		this.name = "GatewayTimeoutException";
	}
}
