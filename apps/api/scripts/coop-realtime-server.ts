/**
 * Native coop WebSocket server (Prompt 8) — runs beside Next.js (separate port).
 *
 *   COOP_REALTIME_PORT=3010 npm run realtime:dev
 *
 * Subscribes: `ws://host:3010/coop-ws` then send
 * `{"type":"subscribe","roomId":"<uuid>","guestId":"<x-guest-id>","protocol":1}`.
 */
import "../src/load-env";
import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import {
  COOP_WS_PROTOCOL_VERSION,
  parseClientToServerMessage,
  type ServerToClientMessage,
} from "@gac/shared";
import { getCoopRoomPublic, CoopHttpError } from "../src/server/services/coop-service";

const PORT = Number(process.env.COOP_REALTIME_PORT ?? "3010") || 3010;
const NOTIFY_SECRET = process.env.COOP_REALTIME_SECRET?.trim();

type SocketMeta = { roomId: string; guestId: string; seq: number };

const socketMeta = new WeakMap<WebSocket, SocketMeta>();
const roomSockets = new Map<string, Set<WebSocket>>();

function removeSocket(ws: WebSocket): void {
  const m = socketMeta.get(ws);
  if (!m) return;
  const set = roomSockets.get(m.roomId);
  set?.delete(ws);
  if (set?.size === 0) roomSockets.delete(m.roomId);
  socketMeta.delete(ws);
}

function addSocket(ws: WebSocket, roomId: string, guestId: string): void {
  removeSocket(ws);
  socketMeta.set(ws, { roomId, guestId, seq: 0 });
  let set = roomSockets.get(roomId);
  if (!set) {
    set = new Set();
    roomSockets.set(roomId, set);
  }
  set.add(ws);
}

async function pushSnapshot(ws: WebSocket): Promise<void> {
  const m = socketMeta.get(ws);
  if (!m) return;

  try {
    const payload = await getCoopRoomPublic({
      roomId: m.roomId,
      viewerGuestId: m.guestId,
    });
    m.seq += 1;
    socketMeta.set(ws, m);
    const msg: ServerToClientMessage<typeof payload> = {
      type: "state",
      seq: m.seq,
      payload,
    };
    ws.send(JSON.stringify(msg));
  } catch (err) {
    const message =
      err instanceof CoopHttpError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Snapshot failed";
    const code = err instanceof CoopHttpError ? `HTTP_${err.status}` : "SNAPSHOT_ERROR";
    ws.send(
      JSON.stringify({
        type: "error",
        code,
        message,
      }),
    );
  }
}

async function broadcastRoom(roomId: string): Promise<void> {
  const set = roomSockets.get(roomId);
  if (!set) return;
  await Promise.all([...set].map((ws) => pushSnapshot(ws)));
}

function readNotifyBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/notify") {
    if (NOTIFY_SECRET) {
      const auth = req.headers.authorization?.trim();
      if (auth !== `Bearer ${NOTIFY_SECRET}`) {
        res.writeHead(401).end("Unauthorized");
        return;
      }
    }

    let body: string;
    try {
      body = await readNotifyBody(req);
    } catch {
      res.writeHead(400).end("Bad body");
      return;
    }

    let roomId: string;
    try {
      const j = JSON.parse(body) as { roomId?: string };
      roomId = typeof j.roomId === "string" ? j.roomId.trim() : "";
    } catch {
      res.writeHead(400).end("Invalid JSON");
      return;
    }

    if (!roomId) {
      res.writeHead(400).end("Missing roomId");
      return;
    }

    await broadcastRoom(roomId);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/coop-ws")) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", async (data: RawData) => {
    const raw = typeof data === "string" ? data : data.toString("utf8");
    const parsed = parseClientToServerMessage(raw);
    if (!parsed) {
      ws.send(
        JSON.stringify({
          type: "error",
          code: "BAD_MESSAGE",
          message: "Unrecognized or invalid envelope.",
        }),
      );
      return;
    }

    if (parsed.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (parsed.type === "subscribe") {
      if (parsed.protocol !== COOP_WS_PROTOCOL_VERSION) {
        ws.send(
          JSON.stringify({
            type: "error",
            code: "PROTOCOL",
            message: `Expected protocol ${COOP_WS_PROTOCOL_VERSION}.`,
          }),
        );
        return;
      }
      addSocket(ws, parsed.roomId, parsed.guestId);
      await pushSnapshot(ws);
    }
  });

  ws.on("close", () => removeSocket(ws));
});

server.listen(PORT, () => {
  console.log(
    `[coop-realtime] listening :${PORT} ws=/coop-ws notify=POST /notify health=GET /health`,
  );
});
