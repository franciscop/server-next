import { NodeWebSocket, encodeFrame } from "./wsNode";

// These tests exercise the RFC 6455 frame codec directly through NodeWebSocket
// with a mock socket, so they're runtime-independent. The full end-to-end path
// (Node http upgrade -> handshake -> live WebSocket client) is verified under
// real Node; it can't run under `bun test` because Bun's node:http emits the
// `upgrade` event but its upgrade socket drops writes.

// A stand-in for the raw TCP socket that records what we write.
class MockSocket {
  writes: Buffer[] = [];
  ended = false;
  write(buf: Buffer) {
    this.writes.push(Buffer.from(buf));
    return true;
  }
  end() {
    this.ended = true;
  }
}

// Build a masked client -> server frame (browsers always mask).
function clientFrame(
  payload: string | Buffer,
  opcode = 0x1,
  fin = true,
): Buffer {
  const data = typeof payload === "string" ? Buffer.from(payload) : payload;
  const len = data.length;
  const b0 = (fin ? 0x80 : 0) | opcode;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.from([b0, 0x80 | len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = b0;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = b0;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

// Decode a server -> client frame (unmasked).
function decodeServerFrame(buf: Buffer) {
  const fin = (buf[0] & 0x80) !== 0;
  const opcode = buf[0] & 0x0f;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) {
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    len = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  return { fin, opcode, payload: buf.subarray(offset, offset + len) };
}

function make() {
  const sock = new MockSocket();
  const messages: (string | Buffer)[] = [];
  let closed = 0;
  const ws = new NodeWebSocket(sock as any, {
    onMessage: (m) => messages.push(m),
    onClose: () => closed++,
  });
  return { sock, ws, messages, get closed() {
    return closed;
  } };
}

describe("wsNode frame codec", () => {
  it("decodes a masked text frame to a string", () => {
    const { ws, messages } = make();
    ws.receive(clientFrame("hello"));
    expect(messages).toEqual(["hello"]);
  });

  it("decodes a binary frame to a Buffer", () => {
    const { ws, messages } = make();
    const bytes = Buffer.from([1, 2, 3, 250]);
    ws.receive(clientFrame(bytes, 0x2));
    expect(Buffer.isBuffer(messages[0])).toBe(true);
    expect(messages[0]).toEqual(bytes);
  });

  it("encodes send('...') as an unmasked text frame", () => {
    const { sock, ws } = make();
    ws.send("hi there");
    const frame = decodeServerFrame(sock.writes[0]);
    expect(frame.fin).toBe(true);
    expect(frame.opcode).toBe(0x1);
    expect(frame.payload.toString()).toBe("hi there");
  });

  it("encodes send(Buffer) as a binary frame", () => {
    const { sock, ws } = make();
    ws.send(Buffer.from([9, 8, 7]));
    const frame = decodeServerFrame(sock.writes[0]);
    expect(frame.opcode).toBe(0x2);
    expect(frame.payload).toEqual(Buffer.from([9, 8, 7]));
  });

  it("reassembles fragmented messages", () => {
    const { ws, messages } = make();
    ws.receive(clientFrame("he", 0x1, false)); // first, not final
    ws.receive(clientFrame("llo", 0x0, true)); // continuation, final
    expect(messages).toEqual(["hello"]);
  });

  it("handles a frame split across two chunks", () => {
    const { ws, messages } = make();
    const frame = clientFrame("split me");
    ws.receive(frame.subarray(0, 4));
    expect(messages).toEqual([]);
    ws.receive(frame.subarray(4));
    expect(messages).toEqual(["split me"]);
  });

  it("parses two frames arriving in one chunk", () => {
    const { ws, messages } = make();
    ws.receive(Buffer.concat([clientFrame("one"), clientFrame("two")]));
    expect(messages).toEqual(["one", "two"]);
  });

  it("replies to ping with a matching pong", () => {
    const { sock, ws, messages } = make();
    ws.receive(clientFrame("ka", 0x9)); // ping
    expect(messages).toEqual([]); // not a message
    const frame = decodeServerFrame(sock.writes[0]);
    expect(frame.opcode).toBe(0xa); // pong
    expect(frame.payload.toString()).toBe("ka");
  });

  it("closes on a close frame", () => {
    const t = make();
    t.ws.receive(clientFrame("", 0x8));
    expect(t.closed).toBe(1);
    expect(t.sock.ended).toBe(true);
  });

  it("handles the 16-bit length path", () => {
    const { ws, messages } = make();
    const big = "x".repeat(200); // needs the 126 marker
    ws.receive(clientFrame(big));
    expect(messages).toEqual([big]);
  });

  it("encodeFrame uses the right length markers", () => {
    expect(encodeFrame(Buffer.alloc(10), 0x1)[1]).toBe(10);
    expect(encodeFrame(Buffer.alloc(200), 0x1)[1]).toBe(126);
    expect(encodeFrame(Buffer.alloc(70000), 0x1)[1]).toBe(127);
  });
});
