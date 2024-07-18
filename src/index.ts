import { convertJsonToFormData } from "@gramio/files";
import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponse,
} from "@gramio/types";

const BASE_URL = "https://api.telegram.org/bot";

type APIMethodRawResponse = {
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

export class Telegram {
	token: string;

	constructor(token: string) {
		this.token = token;
	}

	readonly api = new Proxy({} as APIMethodRawResponse, {
		get:
			<T extends keyof APIMethodRawResponse>(
				_target: APIMethodRawResponse,
				method: T,
			) =>
			async (args: APIMethodParams<T>) => {
				// @ts-expect-error fix types at convertJsonToFormData
				const formData = await convertJsonToFormData(method, args);

				const response = await fetch(`${BASE_URL}${this.token}/${method}`, {
					method: "POST",
					body: formData,
				});

				return response.json() as Promise<TelegramAPIResponse<T>>;
			},
	});
}

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
