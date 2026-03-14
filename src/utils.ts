import type { TelegramUpdate } from "@gramio/types";
import type { Telegram } from "./index.ts";
import { TelegramError } from "./errors.ts";

/**
 * A generator function that implements [long-polling](https://en.wikipedia.org/wiki/Push_technology#Long_polling)
 * via {@link APIMethods.getUpdates | getUpdates} and returns an {@link TelegramUpdate | Update} when it is received
 *
 * @example
 * ```ts
 * for await (const update of getUpdates(telegram)) {
 * 	console.log(update);
 * 	if (update.message?.from) {
 * 		telegram.api.sendMessage({
 * 			chat_id: update.message.from.id,
 * 			text: "Hi! Thank you for the message",
 * 		});
 * 	}
 * }
 * ```
 */
export async function* getUpdates(telegram: Telegram) {
	let offset = 0;

	while (true) {
		const updates = await telegram.api.getUpdates({
			suppress: true,
			offset,
		});

		if (updates instanceof TelegramError || !updates.length) continue;

		for (const update of updates) {
			yield update;
			offset = update.update_id + 1;
		}
	}
}

/** @internal */
export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps an API call and automatically retries when Telegram returns `retry_after`.
 *
 * @example
 * ```ts
 * import { Telegram } from "wrappergram";
 * import { withRetries } from "wrappergram";
 *
 * const telegram = new Telegram("BOT_TOKEN");
 *
 * // Automatically waits and retries on 429 Too Many Requests
 * const result = await withRetries(() =>
 *     telegram.api.sendMessage({
 *         chat_id: "@gramio_forum",
 *         text: "Hello!",
 *     })
 * );
 * ```
 */
export async function withRetries<Result>(
	fn: () => Promise<Result>,
): Promise<Result> {
	let result = await suppressError(fn);

	while (result.value instanceof TelegramError) {
		const retryAfter = result.value.payload?.retry_after;

		if (retryAfter) {
			await sleep(retryAfter * 1000);
			result = await suppressError(fn);
		} else {
			if (result.caught) throw result.value;
			return result.value;
		}
	}

	if (result.caught) throw result.value;

	return result.value;
}

type SuppressResult<T> =
	| { value: T; caught: false }
	| { value: unknown; caught: true };

async function suppressError<T>(
	fn: () => Promise<T>,
): Promise<SuppressResult<T>> {
	try {
		return { value: await fn(), caught: false };
	} catch (error) {
		return { value: error, caught: true };
	}
}

/** @internal */
function convertToString(value: unknown): string {
	const typeOfValue = typeof value;

	if (typeOfValue === "string") return value as string;
	if (typeOfValue === "object") return JSON.stringify(value);
	return String(value);
}

/** @internal */
export function simplifyObject(obj: Record<any, any>) {
	const result: Record<string, string> = {};

	for (const [key, value] of Object.entries(obj)) {
		const typeOfValue = typeof value;

		if (value === undefined || value === null || typeOfValue === "function")
			continue;

		result[key] = convertToString(value);
	}

	return result;
}
