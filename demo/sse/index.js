import { EventEmitter } from "node:events";
import server, { sse, type } from "../..";

const events = new EventEmitter();

const home = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Server-sent events</title></head>
<body>
  <p>Server time: <output id="clock">connecting...</output></p>

  <form id="form">
    <input name="text" placeholder="Say something" autocomplete="off" required />
    <button>Send</button>
  </form>
  <ul id="messages"></ul>

  <script>
    const clock = new EventSource("/clock");
    clock.onmessage = (e) => {
      document.getElementById("clock").textContent =
        new Date(JSON.parse(e.data).now).toLocaleTimeString();
    };

    const chat = new EventSource("/messages/live");
    chat.addEventListener("chat", (e) => {
      const item = document.createElement("li");
      item.textContent = JSON.parse(e.data).text;
      document.getElementById("messages").append(item);
    });

    document.getElementById("form").onsubmit = async (e) => {
      e.preventDefault();
      const text = e.target.text.value;
      e.target.reset();
      await fetch("/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
    };
  </script>
</body>
</html>`;

export default server()
  .get("/", () => type("html").send(home))
  .get("/clock", () => {
    return sse((send) => {
      const timer = setInterval(() => send({ now: Date.now() }), 1000);
      return () => clearInterval(timer);
    });
  })
  .get("/messages/live", () => {
    return sse((send) => {
      const forward = (message) => send("chat", message);
      events.on("chat", forward);
      return () => events.off("chat", forward);
    });
  })
  .post("/messages", (ctx) => {
    events.emit("chat", ctx.body);
    return 201;
  });
