import server from "../../src/index.js";

const sleep = (time) => new Promise((done) => setTimeout(done, time));

export default server().get("/", async (ctx) => {
  ctx.time("init");
  await sleep(800);
  ctx.time("step-1");
  await sleep(300);
  ctx.time("step-2");
  return "Hello there! Check the timing headers";
});
