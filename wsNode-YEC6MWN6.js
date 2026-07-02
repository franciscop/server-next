// src/helpers/wsNode.ts
import { createHash } from "crypto";
var GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
var CONTINUATION = 0;
var TEXT = 1;
var BINARY = 2;
var CLOSE = 8;
var PING = 9;
var PONG = 10;
function encodeFrame(payload, opcode) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([128 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 128 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 128 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}
var NodeWebSocket = class {
  socket;
  handlers;
  buffer;
  fragments;
  fragmentOpcode;
  closed;
  readyState;
  constructor(socket, handlers) {
    this.socket = socket;
    this.handlers = handlers;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOpcode = TEXT;
    this.closed = false;
    this.readyState = 1;
  }
  send(data) {
    if (this.closed) return;
    const isString = typeof data === "string";
    const payload = isString ? Buffer.from(data) : Buffer.from(data);
    this.socket.write(encodeFrame(payload, isString ? TEXT : BINARY));
  }
  close(code = 1e3, reason = "") {
    if (this.closed) return;
    const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
    payload.writeUInt16BE(code, 0);
    payload.write(reason, 2);
    try {
      this.socket.write(encodeFrame(payload, CLOSE));
    } catch {
    }
    this.shutdown();
  }
  // Called once, whether the peer closed, the socket died, or we closed.
  shutdown() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 3;
    try {
      this.socket.end();
    } catch {
    }
    this.handlers.onClose();
  }
  // Feed raw bytes from the TCP socket; parses as many complete frames as it can
  // and buffers the remainder for the next chunk.
  receive(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    while (true) {
      const buf = this.buffer;
      if (buf.length < 2) return;
      const fin = (buf[0] & 128) !== 0;
      const opcode = buf[0] & 15;
      const masked = (buf[1] & 128) !== 0;
      let len = buf[1] & 127;
      let offset = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      let mask = null;
      if (masked) {
        if (buf.length < offset + 4) return;
        mask = buf.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buf.length < offset + len) return;
      let payload = Buffer.from(buf.subarray(offset, offset + len));
      if (mask) {
        for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      }
      this.buffer = buf.subarray(offset + len);
      this.frame(fin, opcode, payload);
    }
  }
  frame(fin, opcode, payload) {
    if (opcode === CLOSE) return this.shutdown();
    if (opcode === PING) {
      if (!this.closed) this.socket.write(encodeFrame(payload, PONG));
      return;
    }
    if (opcode === PONG) return;
    if (opcode === CONTINUATION) {
      this.fragments.push(payload);
    } else {
      this.fragments = [payload];
      this.fragmentOpcode = opcode;
    }
    if (!fin) return;
    const full = this.fragments.length === 1 ? this.fragments[0] : Buffer.concat(this.fragments);
    this.fragments = [];
    const body = this.fragmentOpcode === TEXT ? full.toString("utf8") : full;
    this.handlers.onMessage(body);
  }
};
function attachWebsocket(server, app) {
  server.on("upgrade", (req, socket, head) => {
    const key = req.headers["sec-websocket-key"];
    const upgrade = String(req.headers.upgrade || "").toLowerCase();
    if (upgrade !== "websocket" || !key || !app.handlers.socket.length) {
      socket.destroy();
      return;
    }
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${accept}\r
\r
`
    );
    socket.setTimeout(0);
    socket.setNoDelay(true);
    const ws = new NodeWebSocket(socket, {
      onMessage: (body) => app.websocket.message(ws, body),
      onClose: () => app.websocket.close(ws)
    });
    app.websocket.open(ws);
    if (head?.length) ws.receive(head);
    socket.on("data", (chunk) => ws.receive(chunk));
    socket.on("close", () => ws.shutdown());
    socket.on("error", () => ws.shutdown());
  });
}
export {
  NodeWebSocket,
  attachWebsocket,
  encodeFrame
};
