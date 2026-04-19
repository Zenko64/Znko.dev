/**
 * @name requireAuth
 * @description Middleware to require authentication for protected routes.
 * @file middleware/requireAuth.ts
 * @module middleware/requireAuth
 */
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "#types/hono";

/**
 * @name requireAuth
 * @description Middleware that forces authentication in protected routes.
 * @returns 401 Unauthorized if the user is not authenticated.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.session.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

export default requireAuth;
