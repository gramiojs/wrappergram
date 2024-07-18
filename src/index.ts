import { convertJsonToFormData } from "@gramio/files";
import type { APIMethodParams, TelegramAPIResponse } from "@gramio/types";
import type { APIMethodRawResponse } from "./utils";

export { getUpdates } from "./utils";
export * from "@gramio/files";
export type * from "@gramio/types";

export interface TelegramOptions {
	baseURL?: string;
	requestOptions?: Omit<RequestInit, "method" | "body">;
}

export class Telegram {
	token: string;
	options: TelegramOptions & { baseURL: string };

	constructor(token: string, options?: TelegramOptions) {
		this.token = token;
		this.options = { baseURL: "https://api.telegram.org/bot", ...options };
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
