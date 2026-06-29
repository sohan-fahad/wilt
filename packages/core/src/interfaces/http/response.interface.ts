export type HttpStatusCode = 200 | 201 | 202 | 400 | 401 | 403 | 404 | 409 | 500;

export interface BaseResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	timestamp: string;
}

export interface PaginatedResponse<T = any> extends BaseResponse<T[]> {
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
	timestamp: string;
}
