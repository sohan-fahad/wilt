import type { Context, Next } from "hono";
import { logger } from "../utils/logger.util";

export async function requestLogger(c: Context, next: Next) {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const userAgent = c.req.header("User-Agent");

	await next();

	const end = Date.now();
	const duration = end - start;
	const status = c.res.status;

	logger.http(method, path, status, duration, userAgent);
}
