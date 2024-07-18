import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponse,
} from "@gramio/types";
import type { Telegram } from ".";

export type APIMethodRawResponse = {
	[APIMethod in keyof APIMethods]: APIMethodParams<APIMethod> extends undefined
		? () => Promise<TelegramAPIResponse<APIMethod>>
		: undefined extends APIMethodParams<APIMethod>
			? (
					params?: APIMethodParams<APIMethod>,
				) => Promise<TelegramAPIResponse<APIMethod>>
			: (
					params: APIMethodParams<APIMethod>,
				) => Promise<TelegramAPIResponse<APIMethod>>;
};

export async function* getUpdates(telegram: Telegram) {
	let offset = 0;

	while (true) {
		const updates = await telegram.api.getUpdates({
			offset,
		});

		if (!updates.ok || !updates.result.length) continue;

		for (const update of updates.result) {
			yield update;
			offset = update.update_id + 1;
		}
	}
}
