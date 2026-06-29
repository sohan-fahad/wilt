import type { z } from "zod";
import { BODY_SCHEMA_METADATA } from "../constants";

/**
 * Validates the request body against a Zod schema before the handler runs.
 *
 * The validated (and transformed) value is passed to `@Body()` parameters and
 * is also available via `c.get("validatedData")`. On failure the route
 * responds with a 400 VALIDATION_ERROR payload.
 */
export function ZodValidate(schema: z.ZodSchema): MethodDecorator {
	return (_target, _key, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata(BODY_SCHEMA_METADATA, schema, descriptor.value);
		return descriptor;
	};
}
