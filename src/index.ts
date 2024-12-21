/**
 * Simple and tiny code-generated Telegram Bot API wrapper for TypeScript/JavaScript with file upload support
 * @module
 */
import { convertJsonToFormData } from "@gramio/files";
import type { APIMethodParams, TelegramAPIResponse } from "@gramio/types";
import type { APIMethodRawResponse } from "./utils.ts";

export { getUpdates } from "./utils.ts";
export * from "@gramio/files";
export type * from "@gramio/types";

/**
 * Options for {@link Telegram}
 */
export interface TelegramOptions {
	/** URL which will be used to send requests to.
	 * @default "https://api.telegram.org/bot" */
	baseURL?: string;
	/**
	 * Options to configure request
	 *
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN}
	 */
	requestOptions?: Omit<RequestInit, "method" | "body">;
}

/**
 * Main class of the library. Use {@link Telegram.api | api} key to send requests to Telegram Bot API methods
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

	/** Create new instance */
	constructor(token: string, options?: TelegramOptions) {
		this.token = token;
		this.options = { baseURL: "https://api.telegram.org/bot", ...options };
	}

	/** Send requests to Telegram Bot API
	 *
	 * @example
	 * ```ts
	 * const response = await telegram.api.sendMessage({
	 *   chat_id: "@gramio_forum",
	 *   text: "Hello, world!"
	 * });
	 *
	 * if(!response.ok) console.error("Something went wrong");
	 * else console.log(`New message id is ${response.result.message_id}`);
	 * ```
	 */
	// TODO: hooks, middlewares = great API
	readonly api = new Proxy({} as APIMethodRawResponse, {
		get:
			<T extends keyof APIMethodRawResponse>(
				_target: APIMethodRawResponse,
				method: T,
			) =>
			async (args: APIMethodParams<T>) => {
				// @ts-expect-error fix types at convertJsonToFormData
				const formData = await convertJsonToFormData(method, args);

				const response = await fetch(
					`${this.options.baseURL}${this.token}/${method}`,
					{
						method: "POST",
						body: formData,
						...this.options.requestOptions,
					},
				);

				return response.json() as Promise<TelegramAPIResponse<T>>;
			},
	});
}
