/**
 * @name Session Middleware
 * @description This middleware manages user sessions using cookies and Redis.
 * It creates a random session ID, stores it in Redis (Along with User Data, like the ID, for usage in Routes)
 * And stores the ID in a cookie that is sent on each request, validated by the server against Redis.
 * To destroy a session, set `session._destroyed = true`, which will cause the middleware to delete the Redis record and cookie.
 * This middleware should run before any route handlers, and will continue after all the route handlers have finished.
 * @module core/session
 * @file session.ts
 * @author Zenko
 * @version 1.0.0
 * OK
 */
import type { AppEnv } from "#types/hono";
import { createMiddleware } from "hono/factory";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import redis from "#core/redis";
import { env } from "./env";
import crypto from "crypto";

const sessionCookieName = "znko_session";
const sessionDuration = 1000 * 60 * 60 * 24 * 7;

async function getSessionData(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : {};
}

const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId =
    getCookie(c, sessionCookieName) ?? crypto.randomBytes(32).toString("hex"); // 256Bit Random ID, Very secure.
  const session = await getSessionData(sessionId);
  const sessionSnapshot = JSON.stringify(session); // Snapshot before handler runs.

  c.set("sessionId", sessionId);
  c.set("session", session);

  await next(); // Wait for the route handler to finish

  const finalSession = c.get("session");
  const finalSessionId = c.get("sessionId");
  if (finalSession._destroyed) {
    await redis.del(`session:${finalSessionId}`);
    deleteCookie(c, sessionCookieName, { path: "/" });
    return;
  }

  if (finalSessionId !== sessionId) {
    await redis.del(`session:${sessionId}`);
  }

  setCookie(c, sessionCookieName, finalSessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionDuration / 1000, // MaxAge is in seconds, sessionDuration is in MS.
    path: "/",
  });

  // Only persist to Redis if the session was mutated.
  const isDirty = JSON.stringify(finalSession) !== sessionSnapshot;
  if (isDirty) {
    await redis.set(
      `session:${finalSessionId}`,
      JSON.stringify(finalSession),
      "EX",
      sessionDuration / 1000, // Dividing by 1000 will convert the MS to seconds
    );
  }
});

export default sessionMiddleware;
