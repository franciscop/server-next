import kv from "polystore";

import server from "..";
import { createId } from "../helpers";
import socketUser from "./socketUser";

// socketUser resolves the auth user for a WebSocket upgrade from the request's
// headers/cookies, reusing the HTTP getUser logic. The live handshake can't run
// under `bun test` (see wsNode.test.ts), so we drive the resolver directly with
// a store seeded the same way finishLogin does.
describe("socketUser (websocket auth)", () => {
	const EMAIL = "abc@test.com";

	// Build a server + store with a single logged-in session already persisted.
	function setup(strategy: "cookie" | "token") {
		const store = kv(new Map());
		const app = server({ store, auth: `${strategy}:email` });
		const id = createId(); // 16 chars, the opaque session id
		return { app, id, store };
	}

	async function seed(store: any, id: string, strategy: string) {
		await store.prefix("user:").set(EMAIL, { email: EMAIL, name: "Abc" });
		await store
			.prefix("auth:")
			.set(id, { id, strategy, provider: "email", user: EMAIL });
	}

	it("resolves the user from the `authentication` cookie (browser)", async () => {
		const { app, id, store } = setup("cookie");
		await seed(store, id, "cookie");

		const user = await socketUser(app, {}, { authentication: id });
		expect(user?.email).toBe(EMAIL);
		expect(user?.strategy).toBe("cookie");
		expect(user?.provider).toBe("email");
	});

	it("resolves the user from a Bearer header (non-browser client)", async () => {
		const { app, id, store } = setup("token");
		await seed(store, id, "token");

		const user = await socketUser(app, { authorization: `Bearer ${id}` }, {});
		expect(user?.email).toBe(EMAIL);
		expect(user?.strategy).toBe("token");
	});

	it("is anonymous with no credentials", async () => {
		const { app, id, store } = setup("cookie");
		await seed(store, id, "cookie");

		expect(await socketUser(app, {}, {})).toBeUndefined();
	});

	it("rejects a malformed cookie (throws -> 401 handshake)", async () => {
		const { app, id, store } = setup("cookie");
		await seed(store, id, "cookie");

		// Wrong length -> getUser throws AUTH_INVALID_COOKIE, same as HTTP would 401.
		// The upgrade handlers catch this and refuse the handshake.
		expect(
			socketUser(app, {}, { authentication: "too-short" }),
		).rejects.toThrow();
	});

	it("rejects a malformed Bearer header (throws -> 401 handshake)", async () => {
		const { app, id, store } = setup("token");
		await seed(store, id, "token");

		// A non-Bearer scheme is an invalid credential, not an absent one.
		expect(
			socketUser(app, { authorization: "Basic nope" }, {}),
		).rejects.toThrow();
	});

	it("is anonymous for an unknown session id", async () => {
		const { app } = setup("cookie");
		// A well-formed id that isn't in the store.
		expect(
			await socketUser(app, {}, { authentication: createId() }),
		).toBeUndefined();
	});

	it("is anonymous when no auth is configured", async () => {
		const app = server({});
		expect(
			await socketUser(app, {}, { authentication: createId() }),
		).toBeUndefined();
	});
});
