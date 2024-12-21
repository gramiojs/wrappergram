import {  bench, group, run } from "mitata";

function callAPI(method: any, args: number) {
	return args;
}

const cachedAPI = new Proxy({} as Record<"test", (num: number) => number>, {
	get: (target, method) => target[method] ??= ((args) => callAPI(method, args)),
});

const api = new Proxy({} as Record<"test", (num: number) => number>, {
	get: (target, method) => (args) => callAPI(method, args),
});

group("new Proxy", () => {
	bench("cached", () => cachedAPI.test(2));
	bench("non-cached", () => api.test(2));
});

await run();
