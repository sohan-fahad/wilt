import { VALIDATION_RULES_METADATA } from "../constants";

export interface ValidationRule {
	field: string;
	required?: boolean;
	type?: "string" | "number" | "boolean" | "object" | "array";
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	custom?: (value: any) => boolean;
}

/**
 * Validates the request body against simple field rules before the handler
 * runs. Prefer `@ZodValidate` for anything non-trivial.
 */
export function Validate(rules: ValidationRule[]): MethodDecorator {
	return (_target, _key, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata(VALIDATION_RULES_METADATA, rules, descriptor.value);
		return descriptor;
	};
}
