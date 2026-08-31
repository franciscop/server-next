import { rm } from "node:fs/promises";
import server from "../index";

// Throwaway dirs under the gitignored src/tests/uploads/, cleaned up after
const ROOT = new URL("./tests/uploads/", import.meta.url).pathname;
const DIRS = ["_global", "_avatars", "_videos"].map((d) => `${ROOT}${d}`);
afterAll(() =>
  Promise.all(DIRS.map((d) => rm(d, { recursive: true, force: true }))),
);

const BOUNDARY = "----t";
const headers = {
  "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
};
const multipart = (field: string, content: string) =>
  `--${BOUNDARY}\r\n` +
  `Content-Disposition: form-data; name="${field}"; filename="f.txt"\r\n` +
  `Content-Type: text/plain\r\n\r\n${content}\r\n--${BOUNDARY}--\r\n`;

describe("per-route uploads", () => {
  it("works on a route with no global uploads", async () => {
    const api = server()
      .post("/avatar", { uploads: `${ROOT}_avatars` }, (ctx) => ctx.body)
      .test();
    const res = await api.post("/avatar", multipart("avatar", "pix"), { headers });
    expect(res.status).toBe(200);
    const { avatar } = await res.json();
    expect(avatar.name).toBe("f.txt");
    expect(await Bun.file(`${ROOT}_avatars/${avatar.path}`).text()).toBe("pix");
  });

  it("overrides the global destination (local wins, full replace)", async () => {
    const api = server({ uploads: `${ROOT}_global` })
      .post("/video", { uploads: `${ROOT}_videos` }, (ctx) => ctx.body)
      .post("/other", (ctx) => ctx.body)
      .test();

    const video = await api.post("/video", multipart("file", "vid"), { headers });
    const { file: v } = await video.json();
    expect(await Bun.file(`${ROOT}_videos/${v.path}`).text()).toBe("vid");

    // Sibling routes still use the global destination
    const other = await api.post("/other", multipart("file", "glob"), { headers });
    const { file: o } = await other.json();
    expect(await Bun.file(`${ROOT}_global/${o.path}`).text()).toBe("glob");
  });

  it("takes the object form with its own limits", async () => {
    const api = server()
      .post(
        "/small",
        { uploads: { bucket: `${ROOT}_avatars`, maxFileSize: "5b" } },
        (ctx) => ctx.body,
      )
      .test();
    const big = await api.post("/small", multipart("file", "way-too-long"), {
      headers,
    });
    expect(big.status).toBeGreaterThanOrEqual(400);

    const ok = await api.post("/small", multipart("file", "tiny"), { headers });
    expect(ok.status).toBe(200);
  });

  it("uploads: false disables files for one route only", async () => {
    const api = server({ uploads: `${ROOT}_global` })
      .post("/no-files", { uploads: false }, (ctx) => ctx.body)
      .post("/files", (ctx) => ctx.body)
      .test();

    // File fields are silently skipped without a destination
    const off = await api.post("/no-files", multipart("file", "nope"), { headers });
    expect(await off.json()).toEqual({});

    const on = await api.post("/files", multipart("file", "yep"), { headers });
    expect((await on.json()).file.name).toBe("f.txt");
  });

  it("rejects a bad size string at boot, like the root option", () => {
    expect(() =>
      server().post(
        "/x",
        { uploads: { bucket: `${ROOT}_avatars`, maxFileSize: "5megs" } },
        () => 200,
      ),
    ).toThrow();
  });
});
