import type { Context } from "hono";
import type {
	BaseResponse,
	HttpStatusCode,
	PaginatedResponse,
} from "../interfaces/http/response.interface";

export class _ResponseUtil {
	private static instance: _ResponseUtil;

	private constructor() {} // Prevent direct instantiation

	static getInstance(): _ResponseUtil {
		if (!_ResponseUtil.instance) {
			_ResponseUtil.instance = new _ResponseUtil();
		}
		return _ResponseUtil.instance;
	}

	success<T>(c: Context, data: T, message?: string, status: HttpStatusCode = 200): Response {
		const response: BaseResponse<T> = {
			success: true,
			data,
			message,
			timestamp: new Date().toISOString(),
		};

		return c.json(response, status);
	}

	error(c: Context, message: string, status: HttpStatusCode = 400): Response {
		const response = {
			success: false,
			error: {
				message,
			},
			message: message,
			timestamp: new Date().toISOString(),
		};

		return c.json(response, status);
	}

	paginated<T>(
		c: Context,
		data: T[],
		page: number,
		limit: number,
		total: number,
		message?: string,
	): Response {
		const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

		const response: PaginatedResponse<T> = {
			success: true,
			data,
			message,
			timestamp: new Date().toISOString(),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};

		return c.json(response);
	}
}

export const ResponseUtil = _ResponseUtil.getInstance();
