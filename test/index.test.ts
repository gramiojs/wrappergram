import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Telegram, TelegramError, withRetries } from "../src/index.ts";
import type { Middleware } from "../src/types.ts";

// Mock fetch globally
const mockFetch = mock<typeof fetch>(() => Promise.resolve(new Response()));

globalThis.fetch = mockFetch;

function mockResponse(data: unknown) {
	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json" },
	});
}

beforeEach(() => {
	mockFetch.mockReset();
});

describe("Telegram", () => {
	it("should store token and default options", () => {
		const t = new Telegram("test-token");
		expect(t.token).toBe("test-token");
		expect(t.options.baseURL).toBe("https://api.telegram.org/bot");
	});

	it("should accept custom baseURL", () => {
		const t = new Telegram("tok", { baseURL: "http://localhost:8081/bot" });
		expect(t.options.baseURL).toBe("http://localhost:8081/bot");
	});
});

describe("api proxy", () => {
	it("should send POST with JSON body", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: { message_id: 1 } }),
		);

		const t = new Telegram("tok");
		const result = await t.api.sendMessage({
			chat_id: 123,
			text: "hello",
		});

		expect(result).toEqual({ message_id: 1 });
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [url, init] = mockFetch.mock.calls[0];
		expect(url).toBe("https://api.telegram.org/bottok/sendMessage");
		expect(init?.method).toBe("POST");
		expect((init?.headers as Headers).get("Content-Type")).toBe(
			"application/json",
		);

		const body = JSON.parse(init?.body as string);
		expect(body).toEqual({ chat_id: 123, text: "hello" });
	});

	it("should strip suppress from body", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({
				ok: false,
				error_code: 400,
				description: "Bad Request",
			}),
		);

		const t = new Telegram("tok");
		const result = await t.api.sendMessage({
			suppress: true,
			chat_id: 0,
			text: "",
		});

		expect(result).toBeInstanceOf(TelegramError);

		const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
		expect(body).not.toHaveProperty("suppress");
	});

	it("should cache proxy functions", () => {
		const t = new Telegram("tok");
		const fn1 = t.api.sendMessage;
		const fn2 = t.api.sendMessage;
		expect(fn1).toBe(fn2);
	});
});

describe("TelegramError", () => {
	it("should throw on error response by default", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({
				ok: false,
				error_code: 404,
				description: "Not Found",
			}),
		);

		const t = new Telegram("tok");

		try {
			await t.api.sendMessage({ chat_id: 0, text: "" });
			expect.unreachable("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(TelegramError);
			const te = err as TelegramError<"sendMessage">;
			expect(te.code).toBe(404);
			expect(te.message).toBe("Not Found");
			expect(te.method).toBe("sendMessage");
		}
	});

	it("should return error when suppress: true", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({
				ok: false,
				error_code: 403,
				description: "Forbidden",
			}),
		);

		const t = new Telegram("tok");
		const result = await t.api.sendMessage({
			suppress: true,
			chat_id: 0,
			text: "",
		});

		expect(result).toBeInstanceOf(TelegramError);
		if (result instanceof TelegramError) {
			expect(result.code).toBe(403);
		}
	});

	it("should include payload with retry_after", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({
				ok: false,
				error_code: 429,
				description: "Too Many Requests",
				parameters: { retry_after: 30 },
			}),
		);

		const t = new Telegram("tok");
		const result = await t.api.getMe({
			suppress: true,
		});

		expect(result).toBeInstanceOf(TelegramError);
		if (result instanceof TelegramError) {
			expect(result.payload?.retry_after).toBe(30);
		}
	});
});

describe("fetch options", () => {
	it("should apply global fetchOptions", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: true }),
		);

		const t = new Telegram("tok", {
			fetchOptions: {
				headers: { "X-Custom": "global" },
			},
		});

		await t.api.getMe();

		const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
		expect(headers.get("X-Custom")).toBe("global");
	});

	it("should merge per-request options over global", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: true }),
		);

		const t = new Telegram("tok", {
			fetchOptions: {
				headers: { "X-Global": "yes" },
			},
		});

		await t.api.getMe({}, { headers: { "X-Per-Request": "yes" } });

		const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
		expect(headers.get("X-Global")).toBe("yes");
		expect(headers.get("X-Per-Request")).toBe("yes");
	});
});

describe("middlewares", () => {
	it("should run middlewares in order", async () => {
		const order: number[] = [];

		const mw1: Middleware = async (_ctx, next) => {
			order.push(1);
			const r = await next();
			order.push(4);
			return r;
		};

		const mw2: Middleware = async (_ctx, next) => {
			order.push(2);
			const r = await next();
			order.push(3);
			return r;
		};

		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: true }),
		);

		const t = new Telegram("tok", { middlewares: [mw1, mw2] });
		await t.api.getMe();

		expect(order).toEqual([1, 2, 3, 4]);
	});

	it("should allow middleware to mutate params", async () => {
		const appendText: Middleware = async (ctx, next) => {
			if (ctx.method === "sendMessage") {
				(ctx.params as Record<string, unknown>).text += " (modified)";
			}
			return next();
		};

		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: { message_id: 1 } }),
		);

		const t = new Telegram("tok", { middlewares: [appendText] });
		await t.api.sendMessage({ chat_id: 1, text: "hi" });

		const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
		expect(body.text).toBe("hi (modified)");
	});

	it("should allow middleware to set formData", async () => {
		const fakeFiles: Middleware = async (ctx, next) => {
			const fd = new FormData();
			fd.set("photo", new Blob(["fake"]), "photo.jpg");
			ctx.formData = fd;
			// clear params so they don't go to URL
			ctx.params = {} as typeof ctx.params;
			return next();
		};

		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: { message_id: 1 } }),
		);

		const t = new Telegram("tok", { middlewares: [fakeFiles] });
		await t.api.sendPhoto({ chat_id: 1, photo: "" });

		const [url, init] = mockFetch.mock.calls[0];
		expect(init?.body).toBeInstanceOf(FormData);
		// No Content-Type header when using FormData (browser sets boundary)
		expect((init?.headers as Headers).has("Content-Type")).toBe(false);
	});

	it("should allow middleware to catch errors", async () => {
		let caughtMethod: string | undefined;

		const errorCatcher: Middleware = async (ctx, next) => {
			try {
				return await next();
			} catch (err) {
				if (err instanceof TelegramError) {
					caughtMethod = err.method;
				}
				throw err;
			}
		};

		mockFetch.mockResolvedValueOnce(
			mockResponse({
				ok: false,
				error_code: 400,
				description: "Bad Request",
			}),
		);

		const t = new Telegram("tok", { middlewares: [errorCatcher] });

		try {
			await t.api.sendMessage({ chat_id: 0, text: "" });
		} catch {
			// expected
		}

		expect(caughtMethod).toBe("sendMessage");
	});

	it("should skip middlewares when array is empty", async () => {
		mockFetch.mockResolvedValueOnce(
			mockResponse({ ok: true, result: true }),
		);

		const t = new Telegram("tok");
		const result = await t.api.getMe();

		expect(result).toBe(true);
	});
});

describe("withRetries", () => {
	it("should return result on success", async () => {
		const result = await withRetries(() => Promise.resolve(42));
		expect(result).toBe(42);
	});

	it("should rethrow non-TelegramError", async () => {
		const err = new Error("boom");
		try {
			await withRetries(() => Promise.reject(err));
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBe(err);
		}
	});

	it("should retry on retry_after", async () => {
		let attempt = 0;

		mockFetch.mockImplementation(async () => {
			attempt++;
			if (attempt === 1) {
				return mockResponse({
					ok: false,
					error_code: 429,
					description: "Too Many Requests",
					parameters: { retry_after: 0.01 },
				});
			}
			return mockResponse({ ok: true, result: { message_id: 1 } });
		});

		const t = new Telegram("tok");
		const result = await withRetries(() =>
			t.api.sendMessage({ chat_id: 1, text: "hi" }),
		);

		expect(result).toEqual({ message_id: 1 });
		expect(attempt).toBe(2);
	});
});
