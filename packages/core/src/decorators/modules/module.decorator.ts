import type { ModuleMetadata } from "../../interfaces/modules/module.interface";

export const MODULE_METADATA = "wilt:module";

export function Module(config: ModuleMetadata): ClassDecorator {
	return (target: any) => {
		target.prototype.moduleConfig = config;
		Reflect.defineMetadata(MODULE_METADATA, config, target);
		return target;
	};
}
