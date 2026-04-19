import logger from "#core/logging";
import type { ServerWebSocket, WebSocketHandler } from "bun";
import { shapes } from "@znko/types";
import z from "zod";

type LanyardPresence = z.infer<typeof shapes.discord.lanyardPresenceSchema>;

// Presence data sent to browser clients. Empty for now but can be extended in the future if needed.
type PresenceWsData = Record<string, never>;

// All currently connected browser clients.
const clients = new Set<ServerWebSocket<PresenceWsData>>();

// Latest presence payload — sent immediately to new clients and served via HTTP.
let cachedData: LanyardPresence | null = null;

// Getter that returns cached presence data to other parts of the app.
export function getCachedPresence() {
  return cachedData;
}

function broadcastPresence(data: LanyardPresence) {
  cachedData = data;
  const payload = JSON.stringify(data);
  for (const client of clients) {
    client.send(payload);
  }
}

function connectLanyard(userId: string, lanyardUrl: string) {
  const ws = new WebSocket(`${lanyardUrl}/socket`);
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  // op 1 = Handshake. This allows us to get the heartbeat interval from Lanyard.
  // op 3 = Heartbeat. On this interval we send a message with op 3 to Lanyard to keep the connection alive.
  // op 2 = Subscribe to user presence updates.
  // op 0 = Event (presence update) (Tracked user changes their presence).
  ws.onmessage = (event) => {
    const { op, d } = JSON.parse(event.data as string) as {
      op: number; // Operation code.
      d: Record<string, unknown>; // Data payload
    };

    if (op === 1) {
      heartbeat = setInterval(
        () => ws.send(JSON.stringify({ op: 3 })),
        d["heartbeat_interval"] as number,
      );
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
    }

    if (op === 0) {
      const result = shapes.discord.lanyardPresenceSchema.safeParse(d);
      if (!result.success) {
        logger.error("Lanyard presence parse failed:", result.error.message);
        return;
      }
      broadcastPresence(result.data);
    }
  };

  // If the connection closes and there's a heartbeat running, clear it. Then attempt to reconnect every 5 seconds.
  ws.onclose = () => {
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(() => connectLanyard(userId, lanyardUrl), 5000); // auto-reconnect
  };

  // Log any errors and close the connection to trigger a reconnect.
  ws.onerror = (err) => {
    logger.error("Lanyard WS error:", (err as ErrorEvent).message);
    ws.close();
  };
}

// Pass this to Bun.serve() to handle WebSocket connections on the presence endpoint.
// The type should be a WebSocketHandler with the data that we send to the clients.
export const presenceWebSocket: WebSocketHandler<PresenceWsData> = {
  open(ws: ServerWebSocket<PresenceWsData>) {
    clients.add(ws);
    if (cachedData) ws.send(JSON.stringify(cachedData));
  },
  close(ws: ServerWebSocket<PresenceWsData>) {
    clients.delete(ws);
  },
  message(_ws: ServerWebSocket<PresenceWsData>, _msg: string | Buffer) {
    // Clients receive only; no inbound messages handled.
  },
};

export function startDiscordSocket(lanyardUrl: string) {
  const userId = process.env.DISCORD_USER_ID;
  if (!userId)
    throw new Error("DISCORD_USER_ID environment variable is not set");
  connectLanyard(userId, lanyardUrl);
}
