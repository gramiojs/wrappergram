/**
 * Simple and tiny Telegram Bot API wrapper with middleware chain, configurable fetch, and opt-in file/format support
 * @module
 */
import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponse,
} from "@gramio/types";
import { TelegramError } from "./errors.ts";
import type {
	MaybeSuppressedParams,
	Middleware,
	MiddlewareContext,
	RequestOptions,
	SuppressedAPIMethods,
} from "./types.ts";
import { simplifyObject } from "./utils.ts";

export { TelegramError } from "./errors.ts";
export { getUpdates, withRetries } from "./utils.ts";
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
	 * Can be overridden per-request via the second argument to API methods.
	 *
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN}
	 */
	fetchOptions?: RequestOptions;
	/**
	 * Middleware chain that wraps every API call.
	 * Each middleware receives `(context, next)` — mutate params before `next()`,
	 * set `context.formData` for file uploads, handle results after, or catch errors.
	 *
	 * @example
	 * ```ts
	 * import { Telegram } from "wrappergram";
	 * import { filesMiddleware } from "@gramio/files/middleware";
	 * import { formatMiddleware } from "@gramio/format/middleware";
	 *
	 * const telegram = new Telegram("BOT_TOKEN", {
	 *     middlewares: [formatMiddleware, filesMiddleware],
	 * });
	 * ```
	 */
	middlewares?: Middleware[];
}

/**
 * Main class of the library.
 *
 * Use {@link Telegram.api | api} to call Telegram Bot API methods.
 * Pass middlewares via {@link TelegramOptions.middlewares | options.middlewares}.
 *
 * Without middlewares it's just `fetch` + `JSON.stringify` — zero overhead.
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
 * ```
 */
export class Telegram {
	/** Bot token */
	token: string;
	/** Class {@link TelegramOptions | options} */
	options: TelegramOptions & { baseURL: string };

	private middlewares: Middleware[];

	/** Create new instance */
	constructor(token: string, options?: TelegramOptions) {
		this.token = token;
		this.options = { baseURL: "https://api.telegram.org/bot", ...options };
		this.middlewares = options?.middlewares ?? [];
	}

	/**
	 * Send requests to Telegram Bot API.
	 *
	 * Returns the API result directly (unwrapped from `{ ok, result }`).
	 * Throws {@link TelegramError} on failure, unless `suppress: true` is passed.
	 *
	 * @example
	 * ```ts
	 * const message = await telegram.api.sendMessage({
	 *     chat_id: "@gramio_forum",
	 *     text: "Hello, world!"
	 * });
	 *
	 * // With error suppression
	 * const result = await telegram.api.sendMessage({
	 *     suppress: true,
	 *     chat_id: "@not_found",
	 *     text: "test"
	 * });
	 * if (result instanceof TelegramError) console.error(result.message);
	 *
	 * // With per-request fetch options (second argument)
	 * await telegram.api.sendMessage(
	 *     { chat_id: 123, text: "hi" },
	 *     { signal: AbortSignal.timeout(5000) },
	 * );
	 * ```
	 */
	readonly api = new Proxy({} as SuppressedAPIMethods, {
		get: <T extends keyof SuppressedAPIMethods>(
			_target: SuppressedAPIMethods,
			method: T,
		) =>
			// biome-ignore lint/suspicious/noAssignInExpressions: cache the function
			(_target[method] ??= ((
				args: MaybeSuppressedParams<T>,
				requestOptions?: RequestOptions,
			) => {
				const callSite = new Error();
				if (Error.captureStackTrace) {
					Error.captureStackTrace(callSite, _target[method] as Function);
				}
				return this._callApi(method, args, requestOptions, callSite);
			}) as SuppressedAPIMethods[T]),
	});

	private async _callApi<T extends keyof APIMethods>(
		method: T,
		params: MaybeSuppressedParams<T> = {} as MaybeSuppressedParams<T>,
		perRequestOptions?: RequestOptions,
		callSite?: Error,
	) {
		// Extract suppress flag, keep only API params
		const suppress = (params as Record<string, unknown>)?.suppress as
			| boolean
			| undefined;

		const apiParams = { ...params } as Record<string, unknown>;
		delete apiParams.suppress;

		// Shared mutable context for middleware chain
		const context = { method, params: apiParams } as MiddlewareContext;

		const executeCall = async () => {
			let url = `${this.options.baseURL}${this.token}/${context.method}`;

			// Merge fetch options: global → per-request
			const reqOptions: RequestInit = {
				method: "POST",
				...this.options.fetchOptions,
				...perRequestOptions,
				headers: new Headers({
					...((this.options.fetchOptions?.headers as Record<string, string>) ??
						{}),
					...((perRequestOptions?.headers as Record<string, string>) ?? {}),
				}),
			};

			// Build request body
			if (context.formData) {
				reqOptions.body = context.formData;

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

				if (!suppress) throw err;
				return err;
			}

			return data.result;
		};

		// Compose middleware chain
		if (!this.middlewares.length) return executeCall();

		let fn: () => Promise<unknown> = executeCall;
		for (const mw of [...this.middlewares].reverse()) {
			const prev = fn;
			fn = () => mw(context, prev);
		}

		return fn() as ReturnType<typeof executeCall>;
	}
}
