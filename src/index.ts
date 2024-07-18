import { convertJsonToFormData } from "@gramio/files";
import type { APIMethodParams, TelegramAPIResponse } from "@gramio/types";
import type { APIMethodRawResponse } from "./utils";

export { getUpdates } from "./utils";
export * from "@gramio/files";
export type * from "@gramio/types";

const BASE_URL = "https://api.telegram.org/bot";

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
