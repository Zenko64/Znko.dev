import { getConnInfo } from "hono/bun";
import { env } from "#core/env";
import type { Context } from "hono";
import type { AppEnv } from "#types/hono";

/**
 * Returns the real client IP address.
 * If the TCP peer is a trusted proxy, reads X-Real-IP header.
 * Otherwise returns the direct socket IP.
 */
export function getClientIp(c: Context<AppEnv>): string | undefined {
  const info = getConnInfo(c);
  const peerIp = info.remote.address;

  if (peerIp && env.TRUSTED_PROXIES.includes(peerIp)) {
    return c.req.header("x-real-ip") ?? peerIp;
  }

  return peerIp;
}
