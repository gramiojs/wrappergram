/**
 * Simple and tiny Telegram Bot API wrapper with middleware hooks, configurable fetch, and opt-in file/format support
 * @module
 */
import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponse,
} from "@gramio/types";
import { TelegramError } from "./errors.ts";
import type {
	FullParams,
	Hooks,
	MaybeArray,
	SuppressedAPIMethods,
} from "./types.ts";
import { simplifyObject } from "./utils.ts";

export { TelegramError } from "./errors.ts";
export { getUpdates } from "./utils.ts";
export type * from "./types.ts";
export type * from "@gramio/types";

/**
 * Options for {@link Telegram}
 */
export interface TelegramOptions {
	/**
	 * URL which will be used to send requests to.
	 * @default "https://api.telegram.org/bot"
	 */
	baseURL?: string;
	/**
	 * Global fetch options applied to every request.
	 * Can be overridden per-request via `fetchOptions` in method params.
	 *
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN}
	 */
	fetchOptions?: Omit<RequestInit, "method" | "body">;
}

/**
 * Main class of the library.
 *
 * Use {@link Telegram.api | api} to call Telegram Bot API methods.
 * Use hooks ({@link Telegram.preRequest | preRequest}, {@link Telegram.onResponse | onResponse},
 * {@link Telegram.onResponseError | onResponseError}, {@link Telegram.onApiCall | onApiCall})
 * to customize the request lifecycle.
 *
 * @example
 * ```ts
 * import { Telegram } from "wrappergram";
 *
 * const telegram = new Telegram("BOT_TOKEN");
 *
 * const result = await telegram.api.sendMessage({
 *     chat_id: "@gramio_forum",
 *     text: "Hello, world!"
 * });
 *
 * console.log(`Message id: ${result.message_id}`);
 * ```
 *
 * @example With file upload middleware (`@gramio/files`):
 * ```ts
 * import { Telegram } from "wrappergram";
 * import { isMediaUpload, extractFilesToFormData, MediaUpload } from "@gramio/files";
 *
 * const telegram = new Telegram("BOT_TOKEN")
 *     .preRequest(async (context) => {
 *         if (context.params && isMediaUpload(context.method, context.params)) {
 *             const [formData, rest] = await extractFilesToFormData(context.method, context.params);
 *             if (formData) context.formData = formData;
 *             context.params = rest;
 *         }
 *         return context;
 *     });
 *
 * await telegram.api.sendPhoto({
 *     chat_id: 123,
 *     photo: MediaUpload.path("./photo.jpg"),
 * });
 * ```
 *
 * @example With format middleware (`@gramio/format`):
 * ```ts
 * import { Telegram } from "wrappergram";
 * import { FormattableMap } from "@gramio/format";
 *
 * const telegram = new Telegram("BOT_TOKEN")
 *     .preRequest((context) => {
 *         if (!context.params) return context;
 *         const formattable = FormattableMap[context.method];
 *         if (formattable) context.params = formattable(context.params);
 *         return context;
 *     });
 * ```
 */
export class Telegram {
	/**
	 * Bot token
	 */
	token: string;
	/**
	 * Class {@link TelegramOptions | options}
	 */
	options: TelegramOptions & { baseURL: string };

	private hooks: Hooks.Store = {
		preRequest: [],
		onResponse: [],
		onResponseError: [],
		onApiCall: [],
	};

	/** Create new instance */
	constructor(token: string, options?: TelegramOptions) {
		this.token = token;
		this.options = { baseURL: "https://api.telegram.org/bot", ...options };
	}

	// === Hook Registration ===

	/**
	 * Register a hook called before sending a request to Telegram Bot API.
	 * Can mutate method, params, and set `formData` for file uploads.
	 *
	 * @example
	 * ```ts
	 * // For all methods
	 * telegram.preRequest((context) => {
	 *     console.log(`Calling ${context.method}`);
	 *     return context;
	 * });
	 *
	 * // For specific methods
	 * telegram.preRequest("sendMessage", (context) => {
	 *     context.params.text = "mutated!";
	 *     return context;
	 * });
	 * ```
	 */
	preRequest<
		Methods extends keyof APIMethods,
		Handler extends Hooks.PreRequest<Methods>,
	>(methods: MaybeArray<Methods>, handler: Handler): this;

	preRequest(handler: Hooks.PreRequest): this;

	preRequest<
		Methods extends keyof APIMethods,
		Handler extends Hooks.PreRequest<Methods>,
	>(
		methodsOrHandler: MaybeArray<Methods> | Hooks.PreRequest,
		handler?: Handler,
	) {
		if (
			typeof methodsOrHandler === "string" ||
			Array.isArray(methodsOrHandler)
		) {
			if (!handler)
				throw new Error("Handler is required when methods are specified");

			const methods =
				typeof methodsOrHandler === "string"
					? [methodsOrHandler]
					: methodsOrHandler;

			this.hooks.preRequest.push((async (context) => {
				if ((methods as readonly string[]).includes(context.method))
					return handler(context as Hooks.PreRequestContext<Methods>);
				return context;
			}) as Hooks.PreRequest);
		} else {
			this.hooks.preRequest.push(methodsOrHandler);
		}

		return this;
	}

	/**
	 * Register a hook called when API returns a successful response.
	 *
	 * @example
	 * ```ts
	 * telegram.onResponse((context) => {
	 *     console.log(`${context.method} returned`, context.response);
	 * });
	 *
	 * // For specific methods
	 * telegram.onResponse("sendMessage", (context) => {
	 *     console.log(`Message sent: ${context.response.message_id}`);
	 * });
	 * ```
	 */
	onResponse<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnResponse<Methods>,
	>(methods: MaybeArray<Methods>, handler: Handler): this;

	onResponse(handler: Hooks.OnResponse): this;

	onResponse<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnResponse<Methods>,
	>(
		methodsOrHandler: MaybeArray<Methods> | Hooks.OnResponse,
		handler?: Handler,
	) {
		if (
			typeof methodsOrHandler === "string" ||
			Array.isArray(methodsOrHandler)
		) {
			if (!handler)
				throw new Error("Handler is required when methods are specified");

			const methods =
				typeof methodsOrHandler === "string"
					? [methodsOrHandler]
					: methodsOrHandler;

			this.hooks.onResponse.push(((context) => {
				if ((methods as readonly string[]).includes(context.method))
					return handler(context as Parameters<Handler>[0]);
			}) as Hooks.OnResponse);
		} else {
			this.hooks.onResponse.push(methodsOrHandler);
		}

		return this;
	}

	/**
	 * Register a hook called when API returns an error.
	 * Runs before throwing (or returning if `suppress: true`).
	 *
	 * @example
	 * ```ts
	 * telegram.onResponseError((error, api) => {
	 *     console.error(`${error.method} failed with code ${error.code}: ${error.message}`);
	 * });
	 *
	 * // For specific methods
	 * telegram.onResponseError("sendMessage", (error) => {
	 *     console.error(`sendMessage failed: ${error.message}`);
	 * });
	 * ```
	 */
	onResponseError<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnResponseError<Methods>,
	>(methods: MaybeArray<Methods>, handler: Handler): this;

	onResponseError(handler: Hooks.OnResponseError): this;

	onResponseError<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnResponseError<Methods>,
	>(
		methodsOrHandler: MaybeArray<Methods> | Hooks.OnResponseError,
		handler?: Handler,
	) {
		if (
			typeof methodsOrHandler === "string" ||
			Array.isArray(methodsOrHandler)
		) {
			if (!handler)
				throw new Error("Handler is required when methods are specified");

			const methods =
				typeof methodsOrHandler === "string"
					? [methodsOrHandler]
					: methodsOrHandler;

			this.hooks.onResponseError.push(((error, api) => {
				if ((methods as readonly string[]).includes(error.method))
					return handler(error as Parameters<Handler>[0], api);
			}) as Hooks.OnResponseError);
		} else {
			this.hooks.onResponseError.push(methodsOrHandler);
		}

		return this;
	}

	/**
	 * Register a wrap-style hook around the entire API call execution.
	 * Useful for tracing, instrumentation, or timing.
	 *
	 * @example
	 * ```ts
	 * telegram.onApiCall(async (context, next) => {
	 *     const start = performance.now();
	 *     const result = await next();
	 *     console.log(`${context.method} took ${performance.now() - start}ms`);
	 *     return result;
	 * });
	 *
	 * // For specific methods
	 * telegram.onApiCall("sendMessage", async (context, next) => {
	 *     console.log("About to send message...");
	 *     return next();
	 * });
	 * ```
	 */
	onApiCall<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnApiCall<Methods>,
	>(methods: MaybeArray<Methods>, handler: Handler): this;

	onApiCall(handler: Hooks.OnApiCall): this;

	onApiCall<
		Methods extends keyof APIMethods,
		Handler extends Hooks.OnApiCall<Methods>,
	>(
		methodsOrHandler: MaybeArray<Methods> | Hooks.OnApiCall,
		handler?: Handler,
	) {
		if (
			typeof methodsOrHandler === "string" ||
			Array.isArray(methodsOrHandler)
		) {
			if (!handler)
				throw new Error("Handler is required when methods are specified");

			const methods =
				typeof methodsOrHandler === "string"
					? [methodsOrHandler]
					: methodsOrHandler;

			this.hooks.onApiCall.push(((context, next) => {
				if ((methods as readonly string[]).includes(context.method))
					return handler(context as Parameters<Handler>[0], next);
				return next();
			}) as Hooks.OnApiCall);
		} else {
			this.hooks.onApiCall.push(methodsOrHandler);
		}

		return this;
	}

	// === API Proxy ===

	/**
	 * Send requests to Telegram Bot API.
	 *
	 * Returns the API result directly (unwrapped from `{ ok, result }`).
	 * Throws {@link TelegramError} on failure, unless `suppress: true` is passed.
	 *
	 * @example
	 * ```ts
	 * // Simple call
	 * const message = await telegram.api.sendMessage({
	 *     chat_id: "@gramio_forum",
	 *     text: "Hello, world!"
	 * });
	 * console.log(`New message id is ${message.message_id}`);
	 *
	 * // With error suppression
	 * const result = await telegram.api.sendMessage({
	 *     suppress: true,
	 *     chat_id: "@not_found",
	 *     text: "test"
	 * });
	 * if (result instanceof TelegramError) console.error(result.message);
	 *
	 * // With per-request fetch options
	 * const me = await telegram.api.getMe({
	 *     fetchOptions: { signal: AbortSignal.timeout(5000) }
	 * });
	 * ```
	 */
	readonly api = new Proxy({} as SuppressedAPIMethods, {
		get: <T extends keyof SuppressedAPIMethods>(
			_target: SuppressedAPIMethods,
			method: T,
		) =>
			// biome-ignore lint/suspicious/noAssignInExpressions: cache the function
			(_target[method] ??= ((args: FullParams<T>) => {
				// Capture stack trace at the call site
				const callSite = new Error();
				if (Error.captureStackTrace) {
					Error.captureStackTrace(callSite, _target[method] as Function);
				}

				return this._callApi(method, args, callSite);
			}) as SuppressedAPIMethods[T]),
	});

	// === Internal ===

	private async _callApi<T extends keyof APIMethods>(
		method: T,
		params: FullParams<T> = {} as FullParams<T>,
		callSite?: Error,
	) {
		const executeCall = async () => {
			let url = `${this.options.baseURL}${this.token}/${method}`;

			// Extract wrappergram-specific options
			const suppress = (params as Record<string, unknown>)?.suppress as
				| boolean
				| undefined;
			const perRequestFetchOptions = (
				params as Record<string, unknown>
			)?.fetchOptions as Omit<RequestInit, "method" | "body"> | undefined;

			// Clean params: remove non-API fields
			const apiParams = { ...params } as Record<string, unknown>;
			delete apiParams.suppress;
			delete apiParams.fetchOptions;

			// Merge fetch options: global → per-request
			const reqOptions: RequestInit = {
				method: "POST",
				...this.options.fetchOptions,
				...perRequestFetchOptions,
				headers: new Headers({
					...((this.options.fetchOptions?.headers as Record<string, string>) ??
						{}),
					...((perRequestFetchOptions?.headers as Record<string, string>) ??
						{}),
				}),
			};

			// Run preRequest hooks (sequential, each can mutate context)
			let context: Hooks.PreRequestContext = {
				method,
				params: apiParams,
			} as Hooks.PreRequestContext;

			for (const hook of this.hooks.preRequest) {
				context = await hook(context);
			}

			// Build request body
			if (context.formData) {
				// FormData was set by middleware (e.g. @gramio/files)
				reqOptions.body = context.formData;

				// Put remaining params in URL as query string
				if (context.params && Object.keys(context.params).length) {
					url += `?${new URLSearchParams(simplifyObject(context.params as Record<string, unknown>)).toString()}`;
				}
			} else {
				reqOptions.body = JSON.stringify(context.params);
				(reqOptions.headers as Headers).set(
					"Content-Type",
					"application/json",
				);
			}

			const response = await fetch(url, reqOptions);
			const data = (await response.json()) as TelegramAPIResponse;

			if (!data.ok) {
				const err = new TelegramError(
					data,
					method,
					context.params as APIMethodParams<T>,
					callSite,
				);

				// Run onResponseError hooks
				for (const hook of this.hooks.onResponseError) {
					await hook(err as any, this.api);
				}

				if (!suppress) throw err;

				return err;
			}

			// Run onResponse hooks
			for (const hook of this.hooks.onResponse) {
				await hook({
					method,
					params: context.params,
					response: data.result,
				} as Parameters<Hooks.OnResponse>[0]);
			}

			return data.result;
		};

		// Wrap with onApiCall hooks (reverse order to create proper nesting)
		if (!this.hooks.onApiCall.length) return executeCall();

		let fn: () => Promise<unknown> = executeCall;
		for (const hook of [...this.hooks.onApiCall].reverse()) {
			const prev = fn;
			fn = () =>
				hook(
					{ method, params } as Parameters<Hooks.OnApiCall>[0],
					prev,
				);
		}

		return fn();
	}
}
