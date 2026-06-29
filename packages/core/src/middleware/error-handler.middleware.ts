import type { Context, Next } from "hono";
import { HttpException } from "../exceptions/http-exception";

function isHttpException(err: unknown): err is HttpException {
	return (
		err instanceof HttpException ||
		(err instanceof Error &&
			typeof (err as any).getStatus === "function" &&
			typeof (err as any).getResponse === "function")
	);
}

function isZodError(err: unknown): err is Error & { issues: Array<{ path: (string | number)[]; message: string; code: string }> } {
	return (
		err instanceof Error &&
		(err as any).name === "ZodError" &&
		Array.isArray((err as any).issues)
	);
}

export async function errorHandler(c: Context, next: Next) {
	try {
		await next();
	} catch (error) {
		if (isHttpException(error)) {
			const response = error.getResponse();
			const body =
				typeof response === "string"
					? { success: false, error: { code: error.name, message: response }, timestamp: new Date().toISOString() }
					: { success: false, ...response, timestamp: new Date().toISOString() };
			return c.json(body, error.getStatus() as any);
		}

		if (isZodError(error)) {
			const details = error.issues.map((i) => ({
				field: i.path.join("."),
				message: i.message,
				code: i.code,
			}));
			return c.json(
				{
					success: false,
					error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
					timestamp: new Date().toISOString(),
				},
				400,
			);
		}

		console.error("Unhandled error:", error);
		return c.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: error instanceof Error ? error.message : "Internal server error",
				},
				timestamp: new Date().toISOString(),
			},
			500
		);
	}
}
