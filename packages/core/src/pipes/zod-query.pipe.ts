import type { z } from "zod";
import { QUERY_SCHEMA_METADATA } from "../constants";

/**
 * Validates query parameters against a Zod schema before the handler runs.
 *
 * The validated value is available via `c.get("validatedQuery")`. On failure
 * the route responds with a 400 VALIDATION_ERROR payload.
 */
export function QueryValidate(schema: z.ZodSchema): MethodDecorator {
	return (_target, _key, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata(QUERY_SCHEMA_METADATA, schema, descriptor.value);
		return descriptor;
	};
}
