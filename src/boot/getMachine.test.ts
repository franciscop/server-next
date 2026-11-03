import server from "..";
import getMachine from "./getMachine";

// A query makes Bun load a second copy, with its own once-per-process flag
const FRESH = "./getMachine.ts?banner";

// Production unless development is explicit, so a forgotten NODE_ENV is safe
describe("platform.production", () => {
  const vars = globalThis.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: vars.NODE_ENV, NETLIFY_DEV: vars.NETLIFY_DEV };
  const realWarn = console.warn;
  afterEach(() => {
    vars.NODE_ENV = saved.NODE_ENV;
    vars.NETLIFY_DEV = saved.NETLIFY_DEV;
    console.warn = realWarn;
  });

  const productionWith = (nodeEnv?: string, netlifyDev?: string) => {
    vars.NODE_ENV = nodeEnv;
    vars.NETLIFY_DEV = netlifyDev;
    console.warn = () => {};
    return getMachine().production;
  };

  it("is development only when told", () => {
    expect(productionWith("development")).toBe(false);
    expect(productionWith("test")).toBe(false);
    expect(productionWith(undefined, "true")).toBe(false);
  });

  it("is production for anything else, including nothing", () => {
    expect(productionWith(undefined)).toBe(true);
    expect(productionWith("")).toBe(true);
    expect(productionWith("production")).toBe(true);
    expect(productionWith("staging")).toBe(true);
  });

  it("says so once when NODE_ENV is not set, and never when it is", async () => {
    // A fresh module, so an earlier announcement in this process does not count
    const fresh = (await import(FRESH)).default as typeof getMachine;
    const warned: string[] = [];
    console.warn = (...args: any[]) => warned.push(args.join(" "));

    vars.NODE_ENV = "development";
    fresh();
    vars.NODE_ENV = "production";
    fresh();
    expect(warned).toEqual([]);

    vars.NODE_ENV = undefined;
    fresh();
    fresh();
    expect(warned.length).toBe(1);
    expect(warned[0]).toContain("Running in production mode");
  });

  it("hides the development error page in production", async () => {
    vars.NODE_ENV = "production";
    const res = await server({ log: false })
      .get("/", () => "hi")
      .test()
      .get("/nope", { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type") ?? "").not.toContain("text/html");
    expect(await res.text()).toBe("Not Found");
  });
});
