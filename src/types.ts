import type {
	APIMethodParams,
	APIMethodReturn,
	APIMethods,
} from "@gramio/types";
import type { TelegramError } from "./errors.ts";

/** Type for maybe {@link Promise} or may not */
export type MaybePromise<T> = Promise<T> | T;
export type MaybeArray<T> = T | T[];

// === Suppress ===

/**
 * Interface for adding `suppress` param to method params.
 *
 * Pass `true` to return {@link TelegramError} instead of throwing.
 *
 * @example
 * ```ts
 * const response = await telegram.api.sendMessage({
 *     suppress: true,
 *     chat_id: "@not_found",
 *     text: "Suppressed method"
 * });
 *
 * if (response instanceof TelegramError) console.error("sendMessage returned an error...");
 * else console.log("Message has been sent successfully");
 * ```
 */
export interface Suppress<
	IsSuppressed extends boolean | undefined = undefined,
> {
	suppress?: IsSuppressed;
}

/** Type that assigns API params with {@link Suppress} */
export type MaybeSuppressedParams<
	Method extends keyof APIMethods,
	IsSuppressed extends boolean | undefined = undefined,
> = APIMethodParams<Method> & Suppress<IsSuppressed>;

/** Type that returns MaybeSuppressed API method ReturnType */
export type MaybeSuppressedReturn<
	Method extends keyof APIMethods,
	IsSuppressed extends boolean | undefined = undefined,
> = true extends IsSuppressed
	? TelegramError<Method> | APIMethodReturn<Method>
	: APIMethodReturn<Method>;

// === Per-Request Fetch Options ===

/** Extra options that can be passed per-request alongside API params */
export interface RequestExtra {
	/**
	 * Per-request fetch options. Merged on top of global {@link TelegramOptions.fetchOptions}.
	 *
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN}
	 */
	fetchOptions?: Omit<RequestInit, "method" | "body">;
}

/** Full params type combining API params + suppress + per-request fetch options */
export type FullParams<
	Method extends keyof APIMethods,
	IsSuppressed extends boolean | undefined = undefined,
> = MaybeSuppressedParams<Method, IsSuppressed> & RequestExtra;

// === API Methods Map ===

/** Map of APIMethods with {@link Suppress} and per-request {@link RequestExtra} */
export type SuppressedAPIMethods<
	Methods extends keyof APIMethods = keyof APIMethods,
> = {
	[APIMethod in Methods]: APIMethodParams<APIMethod> extends undefined
		? <IsSuppressed extends boolean | undefined = undefined>(
				params?: Suppress<IsSuppressed> & RequestExtra,
			) => Promise<MaybeSuppressedReturn<APIMethod, IsSuppressed>>
		: undefined extends APIMethodParams<APIMethod>
			? <IsSuppressed extends boolean | undefined = undefined>(
					params?: FullParams<APIMethod, IsSuppressed>,
				) => Promise<MaybeSuppressedReturn<APIMethod, IsSuppressed>>
			: <IsSuppressed extends boolean | undefined = undefined>(
					params: FullParams<APIMethod, IsSuppressed>,
				) => Promise<MaybeSuppressedReturn<APIMethod, IsSuppressed>>;
};

// === Hook Types ===

type AnyTelegramMethod<Methods extends keyof APIMethods> = {
	[APIMethod in Methods]: {
		method: APIMethod;
		params: APIMethodParams<APIMethod>;
	};
}[Methods];

type AnyTelegramMethodWithReturn<Methods extends keyof APIMethods> = {
	[APIMethod in Methods]: {
		method: APIMethod;
		params: APIMethodParams<APIMethod>;
		response: APIMethodReturn<APIMethod>;
	};
}[Methods];

type AnyTelegramError<Methods extends keyof APIMethods = keyof APIMethods> = {
	[APIMethod in Methods]: TelegramError<APIMethod>;
}[Methods];

/**
 * Namespace with wrappergram hooks types
 *
 * Modeled after GramIO's hook system for API call lifecycle.
 */
export namespace Hooks {
	/** Argument type for {@link PreRequest} */
	export type PreRequestContext<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = AnyTelegramMethod<Methods> & {
		/**
		 * Set by middleware (e.g. `@gramio/files`) to provide FormData body
		 * instead of JSON. When set, remaining `params` are sent as URL query string.
		 */
		formData?: FormData;
	};

	/**
	 * Type for `preRequest` hook.
	 *
	 * Called before sending a request to Telegram Bot API.
	 * Can mutate method/params and set `formData` for file uploads.
	 *
	 * @example
	 * ```ts
	 * telegram.preRequest((context) => {
	 *     if (context.method === "sendMessage") {
	 *         context.params.text = "mutated!";
	 *     }
	 *     return context;
	 * });
	 * ```
	 */
	export type PreRequest<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = (
		ctx: PreRequestContext<Methods>,
	) => MaybePromise<PreRequestContext<Methods>>;

	/**
	 * Type for `onResponse` hook.
	 *
	 * Called when API returns a successful response.
	 *
	 * @example
	 * ```ts
	 * telegram.onResponse((context) => {
	 *     console.log(`${context.method} succeeded`);
	 * });
	 * ```
	 */
	export type OnResponse<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = (ctx: AnyTelegramMethodWithReturn<Methods>) => unknown;

	/**
	 * Type for `onResponseError` hook.
	 *
	 * Called when API returns an error. Runs before throwing (or suppressing).
	 *
	 * @example
	 * ```ts
	 * telegram.onResponseError((error, api) => {
	 *     console.error(`${error.method} failed: ${error.message}`);
	 * });
	 * ```
	 */
	export type OnResponseError<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = (error: AnyTelegramError<Methods>, api: SuppressedAPIMethods) => unknown;

	/** Argument type for {@link OnApiCall} */
	export type OnApiCallContext<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = AnyTelegramMethod<Methods>;

	/**
	 * Type for `onApiCall` hook (wrap-style).
	 *
	 * Wraps the entire API call execution, enabling tracing/instrumentation.
	 *
	 * @example
	 * ```ts
	 * telegram.onApiCall(async (context, next) => {
	 *     const start = performance.now();
	 *     const result = await next();
	 *     console.log(`${context.method} took ${performance.now() - start}ms`);
	 *     return result;
	 * });
	 * ```
	 */
	export type OnApiCall<
		Methods extends keyof APIMethods = keyof APIMethods,
	> = (
		ctx: OnApiCallContext<Methods>,
		next: () => Promise<unknown>,
	) => Promise<unknown>;

	/** Store for all hook arrays */
	export interface Store {
		preRequest: PreRequest[];
		onResponse: OnResponse[];
		onResponseError: OnResponseError[];
		onApiCall: OnApiCall[];
	}
}
