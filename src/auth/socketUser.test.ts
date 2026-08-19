import kv from "polystore";

import server from "..";
import { createId } from "../helpers";
import socketUser from "./socketUser";

// socketUser resolves the auth user for a WebSocket upgrade from the request's
// headers/cookies, reusing the HTTP getUser logic. The live handshake can't run
// under `bun test` (see wsNode.test.ts), so we drive the resolver directly with
// stores seeded the same way finishLogin does.
describe("socketUser (websocket auth)", () => {
	const EMAIL = "abc@test.com";

	// Build a server + stores with a single logged-in session already persisted.
	function setup(strategy: "cookie" | "token") {
		const sessions = kv(new Map());
		const users = kv(new Map());
		const app = server({
			auth: { strategy, providers: ["email"], users, sessions },
		});
		const id = createId(); // 16 chars, the opaque session id
		return { app, id, sessions, users };
	}

	async function seed(stores: any, id: string, strategy: string) {
		await stores.users.set(EMAIL, {
			id: "u1",
			email: EMAIL,
			name: "Abc",
			provider: "email",
			strategy,
		});
		await stores.sessions.set(id, {
			user: EMAIL,
			provider: "email",
			created: "2024-07-01T03:21:40Z",
		});
	}

	it("resolves the user from the `session` cookie (browser)", async () => {
		const { app, id, ...stores } = setup("cookie");
		await seed(stores, id, "cookie");

		const user = await socketUser(app, {}, { session: id });
		expect(user?.email).toBe(EMAIL);
		expect(user?.strategy).toBe("cookie");
		expect(user?.provider).toBe("email");
	});

	it("resolves the user from a Bearer header (non-browser client)", async () => {
		const { app, id, ...stores } = setup("token");
		await seed(stores, id, "token");

		const user = await socketUser(app, { authorization: `Bearer ${id}` }, {});
		expect(user?.email).toBe(EMAIL);
		expect(user?.strategy).toBe("token");
	});

	it("is anonymous with no credentials", async () => {
		const { app, id, ...stores } = setup("cookie");
		await seed(stores, id, "cookie");

		expect(await socketUser(app, {}, {})).toBeUndefined();
	});

	it("is anonymous with an unknown session cookie", async () => {
		const { app, id, ...stores } = setup("cookie");
		await seed(stores, id, "cookie");

		// A garbage cookie just misses the store: a guest, not an error
		expect(await socketUser(app, {}, { session: "too-short" })).toBeUndefined();
	});

	it("rejects a malformed Bearer header (throws -> 401 handshake)", async () => {
		const { app, id, ...stores } = setup("token");
		await seed(stores, id, "token");

		// A non-Bearer scheme is an invalid credential, not an absent one.
		expect(
			socketUser(app, { authorization: "Basic nope" }, {}),
		).rejects.toThrow();
	});

	it("is anonymous for an unknown session id", async () => {
		const { app } = setup("cookie");
		// A well-formed id that isn't in the store.
		expect(await socketUser(app, {}, { session: createId() })).toBeUndefined();
	});

	it("is anonymous when no auth is configured", async () => {
		const app = server({});
		expect(await socketUser(app, {}, { session: createId() })).toBeUndefined();
	});
});
