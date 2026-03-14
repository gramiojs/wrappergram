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
 *
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

function convertToString(value: unknown): string {
	const typeOfValue = typeof value;

	if (typeOfValue === "string") return value as string;
	if (typeOfValue === "object") return JSON.stringify(value);
	return String(value);
}

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
