import type { ArgumentsHost } from "../../context/execution-context";

export interface ExceptionFilter<T = any> {
	catch(exception: T, host: ArgumentsHost): Response | Promise<Response> | void;
}
