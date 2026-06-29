import type { ExecutionContext } from "../../context/execution-context";

export interface CanActivate {
	canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}
