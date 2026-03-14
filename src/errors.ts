import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponseError,
	TelegramResponseParameters,
} from "@gramio/types";

/** Represent {@link TelegramAPIResponseError} and thrown in API calls */
export class TelegramError<T extends keyof APIMethods> extends Error {
	/** Name of the API Method */
	method: T;
	/** Params that were sent */
	params: APIMethodParams<T>;
	/** See {@link TelegramAPIResponseError.error_code} */
	code: number;
	/** Describes why a request was unsuccessful. */
	payload?: TelegramResponseParameters;

	/** Construct new TelegramError */
	constructor(
		error: TelegramAPIResponseError,
		method: T,
		params: APIMethodParams<T>,
		callSite?: Error,
	) {
		super(error.description);

		this.name = method;
		this.method = method;
		this.params = params;
		this.code = error.error_code;

		if (error.parameters) this.payload = error.parameters;

		// Restore stack trace from the original call site
		if (callSite?.stack) {
			const callSiteLines = callSite.stack.split("\n");
			const relevantFrames = callSiteLines.slice(1);

			this.stack = `${this.name}: ${this.message}\n${relevantFrames.join("\n")}`;
		}
	}
}
