export function applyDecorators(
	...decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[]
): (...args: any[]) => any {
	return (target: any, key?: any, descriptor?: any): any => {
		for (const decorator of decorators) {
			const result = (decorator as any)(target, key, descriptor);
			if (result !== undefined) {
				if (descriptor !== undefined) {
					descriptor = result as PropertyDescriptor;
				} else {
					target = result;
				}
			}
		}
		return descriptor ?? target;
	};
}
