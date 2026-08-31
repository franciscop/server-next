import server from "..";

describe("a library instance gets the exact bytes", () => {
  it("streams the body through unparsed", async () => {
    let seen: string | undefined;
    const app = server({
      auth: {
        handler: async (request: Request) => {
          seen = await request.text();
          return new Response("ok");
        },
        user: () => undefined,
      },
    });

    await app.test().post("/api/auth/sign-in/email", { email: "a@b.c" });
    // Byte-for-byte, not re-serialised from a parsed object
    expect(seen).toBe('{"email":"a@b.c"}');
  });
});
