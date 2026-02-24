import kv from "polystore";
import server from "../..";

type Session = { counter?: number };
const session = kv<Session>(`file://${process.cwd()}/store/`);

type Options = { Session: Session };
export default server<Options>({ session }).get("/", (ctx) => {
  ctx.session.counter ??= 0;
  ctx.session.counter++;
  return `Visited ${ctx.session.counter} times`;
});
