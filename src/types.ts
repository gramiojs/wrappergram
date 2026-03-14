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

// === Middleware ===

/** Middleware context — shared mutable state that flows through the middleware chain */
export type MiddlewareContext<
	Methods extends keyof APIMethods = keyof APIMethods,
> = {
	[M in Methods]: {
		method: M;
		params: APIMethodParams<M>;
		/**
		 * Set by middleware (e.g. `@gramio/files`) to provide FormData body
		 * instead of JSON. When set, remaining `params` are sent as URL query string.
		 */
		formData?: FormData;
	};
}[Methods];

/**
 * Middleware function that wraps the API call lifecycle.
 *
 * - Mutate `context.params` before `next()` (like preRequest)
 * - Set `context.formData` for file uploads
 * - Handle result after `next()` (like onResponse)
 * - Catch errors from `next()` (like onResponseError)
 *
 * @example
 * ```ts
 * // Logging middleware
 * const logger: Middleware = async (context, next) => {
 *     console.log(`→ ${context.method}`);
 *     const result = await next();
 *     console.log(`← ${context.method}`);
 *     return result;
 * };
 *
 * // Error handling middleware
 * const errorHandler: Middleware = async (context, next) => {
 *     try {
 *         return await next();
 *     } catch (error) {
 *         if (error instanceof TelegramError) {
 *             console.error(`${error.method} failed: ${error.message}`);
 *         }
 *         throw error;
 *     }
 * };
 * ```
 */
export type Middleware<
	Methods extends keyof APIMethods = keyof APIMethods,
> = (
	context: MiddlewareContext<Methods>,
	next: () => Promise<unknown>,
) => Promise<unknown>;
