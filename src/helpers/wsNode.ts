import type { Server } from "..";
import socketUser from "../auth/socketUser";
import parseCookies from "./parseCookies";

// Node has no built-in WebSocket server, so we implement the bits of RFC 6455
// we need: the upgrade handshake plus a frame codec (masking, fragmentation,
// ping/pong/close, and 7/16/64-bit lengths). This module is imported normally
// (bundled into index.js), but its only Node-specific dependency (`node:crypto`)
// is imported lazily inside attachWebsocket, so it never loads on other runtimes
// (attachWebsocket only ever runs on the Node path).

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// Opcodes
const CONTINUATION = 0x0;
const TEXT = 0x1;
const BINARY = 0x2;
const CLOSE = 0x8;
const PING = 0x9;
const PONG = 0xa;

type Handlers = {
	onMessage: (data: string | Buffer) => void;
	onClose: () => void;
};

// Encodes a server -> client frame (unmasked, always FIN).
export function encodeFrame(payload: Buffer, opcode: number): Buffer {
	const len = payload.length;
	let header: Buffer;
	if (len < 126) {
		header = Buffer.from([0x80 | opcode, len]);
	} else if (len < 65536) {
		header = Buffer.allocUnsafe(4);
		header[0] = 0x80 | opcode;
		header[1] = 126;
		header.writeUInt16BE(len, 2);
	} else {
		header = Buffer.allocUnsafe(10);
		header[0] = 0x80 | opcode;
		header[1] = 127;
		header.writeBigUInt64BE(BigInt(len), 2);
	}
	return Buffer.concat([header, payload]);
}

// A single connection. `send()` matches Bun's ServerWebSocket enough for the
// `.socket()` handlers (which only use `send`), and the object identity is
// stable so `socket === ctx.socket` works when broadcasting.
export class NodeWebSocket {
	private socket: any;
	private handlers: Handlers;
	private buffer: Buffer;
	private fragments: Buffer[];
	private fragmentOpcode: number;
	private closed: boolean;
	readyState: number;
	// The auth user resolved from the upgrade request (see attachWebsocket), or
	// undefined for an anonymous connection. Read by socket handlers as `ctx.user`.
	user?: unknown;

	constructor(socket: any, handlers: Handlers) {
		this.socket = socket;
		this.handlers = handlers;
		this.buffer = Buffer.alloc(0);
		this.fragments = [];
		this.fragmentOpcode = TEXT;
		this.closed = false;
		this.readyState = 1; // OPEN
	}

	send(data: string | Buffer | Uint8Array): void {
		if (this.closed) return;
		const isString = typeof data === "string";
		const payload = isString ? Buffer.from(data) : Buffer.from(data as any);
		this.socket.write(encodeFrame(payload, isString ? TEXT : BINARY));
	}

	close(code = 1000, reason = ""): void {
		if (this.closed) return;
		const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
		payload.writeUInt16BE(code, 0);
		payload.write(reason, 2);
		try {
			this.socket.write(encodeFrame(payload, CLOSE));
		} catch {}
		this.shutdown();
	}

	// Called once, whether the peer closed, the socket died, or we closed.
	shutdown(): void {
		if (this.closed) return;
		this.closed = true;
		this.readyState = 3; // CLOSED
		try {
			this.socket.end();
		} catch {}
		this.handlers.onClose();
	}

	// Feed raw bytes from the TCP socket; parses as many complete frames as it can
	// and buffers the remainder for the next chunk.
	receive(chunk: Buffer): void {
		this.buffer = this.buffer.length
			? Buffer.concat([this.buffer, chunk])
			: chunk;

		while (true) {
			const buf = this.buffer;
			if (buf.length < 2) return;

			const fin = (buf[0] & 0x80) !== 0;
			const opcode = buf[0] & 0x0f;
			const masked = (buf[1] & 0x80) !== 0;
			let len = buf[1] & 0x7f;
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

			let mask: Buffer | null = null;
			if (masked) {
				if (buf.length < offset + 4) return;
				mask = buf.subarray(offset, offset + 4);
				offset += 4;
			}

			if (buf.length < offset + len) return; // wait for the full payload

			const payload = Buffer.from(buf.subarray(offset, offset + len));
			if (mask) {
				for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
			}
			this.buffer = buf.subarray(offset + len);
			this.frame(fin, opcode, payload);
		}
	}

	private frame(fin: boolean, opcode: number, payload: Buffer): void {
		if (opcode === CLOSE) {
			this.shutdown();
			return;
		}
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

		const full =
			this.fragments.length === 1
				? this.fragments[0]
				: Buffer.concat(this.fragments);
		this.fragments = [];
		const body = this.fragmentOpcode === TEXT ? full.toString("utf8") : full;
		this.handlers.onMessage(body);
	}
}

// Attaches WebSocket upgrade handling to a Node http.Server. On a valid upgrade
// it completes the handshake and bridges the connection to the shared
// `app.websocket` handlers (open/message/close) used by `.socket()` routes.
// `node:crypto` is imported here (lazily) so this module stays runtime-agnostic.
export async function attachWebsocket(server: any, app: Server): Promise<void> {
	const { createHash } = await import("node:crypto");
	server.on("upgrade", async (req: any, socket: any, head: Buffer) => {
		const key = req.headers["sec-websocket-key"];
		const upgrade = String(req.headers.upgrade || "").toLowerCase();

		// Reject non-WebSocket upgrades, or any upgrade when no `.socket()` routes
		// are registered (checked live, since routes are added after startup).
		if (upgrade !== "websocket" || !key || !app.handlers.socket.length) {
			socket.destroy();
			return;
		}

		// Resolve the auth user from the upgrade request (cookies for browsers, or a
		// Bearer header) before completing the handshake, so it's ready for the
		// `open` handler and every later message. A present-but-invalid credential
		// throws: refuse the upgrade with 401, the same status an HTTP route gives
		// (an absent or expired one resolves to no user and connects anonymously).
		const cookies = parseCookies(req.headers.cookie);
		let user: unknown;
		try {
			user = await socketUser(app, req.headers, cookies);
		} catch {
			socket.write(
				"HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
			);
			socket.destroy();
			return;
		}

		const accept = createHash("sha1")
			.update(key + GUID)
			.digest("base64");
		socket.write(
			"HTTP/1.1 101 Switching Protocols\r\n" +
				"Upgrade: websocket\r\n" +
				"Connection: Upgrade\r\n" +
				`Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
		);
		socket.setTimeout(0);
		socket.setNoDelay(true);

		const ws = new NodeWebSocket(socket, {
			onMessage: (body) => app.websocket.message(ws, body),
			onClose: () => app.websocket.close(ws),
		});
		ws.user = user;

		app.websocket.open(ws); // pushes to app.sockets + runs `open` handlers
		if (head?.length) ws.receive(head);
		socket.on("data", (chunk: Buffer) => ws.receive(chunk));
		socket.on("close", () => ws.shutdown());
		socket.on("error", () => ws.shutdown());
	});
}
