import server from "..";
import safeEqual from "../helpers/safeEqual";

describe("key auth (shared secret)", () => {
	const KEY = "s3cr3t-api-key";
	const api = server({ auth: { strategy: "key", key: KEY } })
		.get("/me", (ctx) => ctx.user || "No data")
		.test();

	it("authenticates a matching Bearer key", async () => {
		const me = await api.get("/me", {
			headers: { authorization: `Bearer ${KEY}` },
		});
		expect(me.status).toBe(200);
		const user = await me.json();
		expect(user).toEqual({ id: "key", strategy: "key", provider: "key" });
	});

	it("stays anonymous with no Authorization header", async () => {
		const anon = await api.get("/me");
		expect(await anon.text()).toBe("No data");
	});

	it("rejects a wrong key", async () => {
		const bad = await api.get("/me", {
			headers: { authorization: "Bearer nope" },
		});
		expect(bad.status).toBe(401);
	});

	it("rejects a non-Bearer scheme", async () => {
		const bad = await api.get("/me", {
			headers: { authorization: `Basic ${KEY}` },
		});
		expect(bad.status).toBe(401);
	});

	it("registers no login/logout route (stateless)", async () => {
		const logout = await api.post("/auth/logout", {});
		expect(logout.status).toBe(404);
	});

	it("reads the secret from the AUTH_KEY env var", async () => {
		Object.assign(globalThis.env, { AUTH_KEY: "from-env" });
		try {
			const app = server({ auth: "key" })
				.get("/me", (ctx) => ctx.user || "No data")
				.test();
			const ok = await app.get("/me", {
				headers: { authorization: "Bearer from-env" },
			});
			expect((await ok.json()).id).toBe("key");
		} finally {
			delete globalThis.env.AUTH_KEY;
		}
	});

	it("throws when no key is configured", () => {
		expect(() => server({ auth: "key" })).toThrow("AUTH_KEY");
	});
});

describe("safeEqual", () => {
	it("matches equal strings", () => {
		expect(safeEqual("abc", "abc")).toBe(true);
	});
	it("rejects different strings", () => {
		expect(safeEqual("abc", "abd")).toBe(false);
	});
	it("rejects different lengths", () => {
		expect(safeEqual("abc", "abcd")).toBe(false);
	});
});
