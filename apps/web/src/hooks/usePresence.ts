import { useEffect, useState } from "react";
import type { PresenceData } from "@/types/discord";
import { shapes } from "@znko/types";
import { client } from "@/lib/client";

/**
 * @name usePresence
 * @description This hooks connects to the presence WebSocket endpoint and returns real time presence data. In case of Error, it tries to reconnect every 3 second. On component unmount, it closes the WebSocket.
 * @returns PresenceData or Null, and in case of an error, true.
 */
export function usePresence() {
  const [data, setData] = useState<PresenceData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let closed = false;
    let timeout: NodeJS.Timeout | null = null;
    let ws: WebSocket | null = null;

    const connect = () => {
      ws = new WebSocket(client.api.presence.$path());
      ws.onmessage = (event) => {
        try {
          const newPresenceData = shapes.discord.lanyardPresenceSchema.parse(
            JSON.parse(event.data),
          ); // validate input data
          setData(newPresenceData);
          setError(false); // clear any previous transient error on successful parse
        } catch (err) {
          console.error("Failed to parse presence data:", err);
          setError(true);
        }
      };
      ws.onclose = () => {
        if (!closed) {
          setError(true);
          timeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      // On component unload we close the websocket and set a flag to prevent reconnects. Also clear any pending reconnect.
      closed = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return { data, error };
}
