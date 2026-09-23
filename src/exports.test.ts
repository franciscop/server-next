import server, { bucket } from ".";

// Auth takes no storage, so `bucket` is the only library that ships: it backs
// `uploads` and `public`.
describe("re-exported libraries", () => {
  it("exports the bucket providers", () => {
    expect(typeof bucket.FS).toBe("function");
    expect(typeof bucket.S3).toBe("function");
  });

  it("the framework itself never asks for one", () => {
    // A whole app with auth, and not a store in sight
    process.env.GITHUB_CLIENT_ID = "id";
    process.env.GITHUB_CLIENT_SECRET = "secret";
    expect(() => server({ secrets: "s", auth: "cookie:github" })).not.toThrow();
  });
});
