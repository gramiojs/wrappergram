import { describe, it, expectTypeOf } from "bun:test";
import { Telegram, TelegramError } from "../src/index.ts";
import type {
	Middleware,
	MiddlewareContext,
	MaybeSuppressedReturn,
	MaybeSuppressedParams,
	RequestOptions,
	Suppress,
	SuppressedAPIMethods,
} from "../src/types.ts";
import type { TelegramMessage, TelegramUser } from "@gramio/types";

const t = new Telegram("tok");

describe("Telegram class types", () => {
	it("token is string", () => {
		expectTypeOf(t.token).toBeString();
	});

	it("options has baseURL as string", () => {
		expectTypeOf(t.options.baseURL).toBeString();
	});

	it("api is SuppressedAPIMethods", () => {
		expectTypeOf(t.api).toEqualTypeOf<SuppressedAPIMethods>();
	});
});

describe("api return types", () => {
	it("sendMessage returns Promise<TelegramMessage>", () => {
		expectTypeOf(t.api.sendMessage({ chat_id: 1, text: "hi" })).resolves.toEqualTypeOf<TelegramMessage>();
	});

	it("getMe returns Promise<TelegramUser>", () => {
		expectTypeOf(t.api.getMe()).resolves.toEqualTypeOf<TelegramUser>();
	});

	it("deleteMessage returns Promise<true>", () => {
		expectTypeOf(
			t.api.deleteMessage({ chat_id: 1, message_id: 1 }),
		).resolves.toEqualTypeOf<true>();
	});
});

describe("suppress types", () => {
	it("suppress: true returns TelegramError | Result", () => {
		expectTypeOf(
			t.api.sendMessage({ suppress: true, chat_id: 1, text: "hi" }),
		).resolves.toEqualTypeOf<TelegramError<"sendMessage"> | TelegramMessage>();
	});

	it("suppress: undefined returns just Result", () => {
		expectTypeOf(
			t.api.sendMessage({ suppress: undefined, chat_id: 1, text: "hi" }),
		).resolves.toEqualTypeOf<TelegramMessage>();
	});

	it("no suppress returns just Result", () => {
		expectTypeOf(
			t.api.sendMessage({ chat_id: 1, text: "hi" }),
		).resolves.toEqualTypeOf<TelegramMessage>();
	});

	it("getMe with suppress returns TelegramError | TelegramUser", () => {
		expectTypeOf(
			t.api.getMe({ suppress: true }),
		).resolves.toEqualTypeOf<TelegramError<"getMe"> | TelegramUser>();
	});
});

describe("MaybeSuppressedReturn", () => {
	it("true returns union", () => {
		expectTypeOf<
			MaybeSuppressedReturn<"sendMessage", true>
		>().toEqualTypeOf<TelegramError<"sendMessage"> | TelegramMessage>();
	});

	it("undefined returns just Result", () => {
		expectTypeOf<
			MaybeSuppressedReturn<"sendMessage", undefined>
		>().toEqualTypeOf<TelegramMessage>();
	});

	it("false returns just Result", () => {
		expectTypeOf<
			MaybeSuppressedReturn<"sendMessage", false>
		>().toEqualTypeOf<TelegramMessage>();
	});
});

describe("MaybeSuppressedParams", () => {
	it("includes suppress field", () => {
		expectTypeOf<
			MaybeSuppressedParams<"sendMessage", true>
		>().toMatchObjectType<{ suppress?: true }>();
	});

	it("includes API params", () => {
		expectTypeOf<
			MaybeSuppressedParams<"sendMessage">
		>().toMatchObjectType<{ chat_id: number | string; text: string }>();
	});
});

describe("Suppress", () => {
	it("default has optional suppress", () => {
		expectTypeOf<Suppress>().toEqualTypeOf<{ suppress?: undefined }>();
	});

	it("true has suppress true", () => {
		expectTypeOf<Suppress<true>>().toEqualTypeOf<{ suppress?: true }>();
	});
});

describe("RequestOptions (second argument)", () => {
	it("is Omit<RequestInit, 'method' | 'body'>", () => {
		expectTypeOf<RequestOptions>().toMatchObjectType<{
			signal?: AbortSignal | null;
			headers?: HeadersInit;
		}>();
	});

	it("does not include method or body", () => {
		expectTypeOf<RequestOptions>().not.toMatchObjectType<{ method: string }>();
		expectTypeOf<RequestOptions>().not.toMatchObjectType<{ body: BodyInit }>();
	});

	it("api method accepts second argument", () => {
		// Should compile without error
		expectTypeOf(t.api.sendMessage).toBeFunction();
		expectTypeOf(
			t.api.sendMessage({ chat_id: 1, text: "hi" }, { signal: AbortSignal.timeout(5000) }),
		).resolves.toEqualTypeOf<TelegramMessage>();
	});
});

describe("Middleware types", () => {
	it("Middleware is a function", () => {
		expectTypeOf<Middleware>().toBeFunction();
	});

	it("Middleware accepts context and next", () => {
		expectTypeOf<Middleware>().parameters.toEqualTypeOf<
			[MiddlewareContext, () => Promise<unknown>]
		>();
	});

	it("Middleware returns Promise<unknown>", () => {
		expectTypeOf<Middleware>().returns.toEqualTypeOf<Promise<unknown>>();
	});
});

describe("MiddlewareContext", () => {
	it("has method and params fields", () => {
		expectTypeOf<MiddlewareContext>().toMatchObjectType<{
			method: string;
			params: unknown;
		}>();
	});

	it("has optional formData", () => {
		expectTypeOf<MiddlewareContext>().toMatchObjectType<{
			formData?: FormData;
		}>();
	});
});

describe("TelegramError types", () => {
	it("extends Error", () => {
		expectTypeOf<TelegramError<"sendMessage">>().toMatchObjectType<Error>();
	});

	it("has method field matching generic", () => {
		expectTypeOf<TelegramError<"sendMessage">>().toMatchObjectType<{
			method: "sendMessage";
		}>();
	});

	it("has code as number", () => {
		expectTypeOf<TelegramError<"sendMessage">>().toMatchObjectType<{
			code: number;
		}>();
	});

	it("has message as string", () => {
		expectTypeOf<TelegramError<"sendMessage">>().toMatchObjectType<{
			message: string;
		}>();
	});
});

describe("TelegramOptions types", () => {
	it("constructor accepts options with middlewares", () => {
		const mw: Middleware = async (_ctx, next) => next();
		// Should compile
		const _t = new Telegram("tok", {
			baseURL: "http://localhost/bot",
			fetchOptions: { headers: { "X-Custom": "yes" } },
			middlewares: [mw],
		});
		expectTypeOf(_t).toEqualTypeOf<Telegram>();
	});
});
