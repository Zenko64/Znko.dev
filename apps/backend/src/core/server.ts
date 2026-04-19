/**
 * @name server
 * @module core/server
 * @description Main server setup and route registration.
 * Initializes the Hono app, sets up middlewares, attaches the routes, and starts the server.
 * Only starts up after the healthchecks, which include database connectivity, and environment validation (#core/env side effect).
 * Also establishes the database connection and handles static file serving for uploads.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { env } from "#core/env";
import { checkDb } from "#db/index";
import { ROUTES } from "@znko/consts";
import { authRouter } from "#routes/auth";
import { postsRouter } from "#routes/posts";
import { gamesRouter } from "#routes/games";
import { videosRouter, videosProgressRouter } from "#routes/videos";
import { usersRouter } from "#routes/users";
import { presenceHandler } from "#routes/discord";
import type { AppEnv } from "#types/hono";
import { presenceWebSocket, startDiscordSocket } from "#services/discord";
import sessionMiddleware from "#core/session";
import { uploadsRouter } from "#routes/uploads";
import fileServe from "#middleware/fileServe";
import errorHandler from "#middleware/errorHandler";
import logger from "./logging";
import universe from "#/queue/schedulers/universe";
import queue from "#/queue";

const app = new Hono<AppEnv>()
  .use("*", cors({ origin: env.APP_URL, credentials: true }))
  .use("*", csrf({ origin: env.APP_URL }))
  .use("*", sessionMiddleware)
  .use("*", fileServe)
  .route(ROUTES.uploads, uploadsRouter)
  .route(ROUTES.auth.base, authRouter)
  .route(ROUTES.profiles, usersRouter)
  .route(ROUTES.posts, postsRouter)
  .route(ROUTES.games, gamesRouter)
  .route(ROUTES.videos, videosRouter)
  .route(ROUTES.videos, videosProgressRouter)
  .get(ROUTES.presence, presenceHandler)
  .onError(errorHandler);

const start = async () => {
  await checkDb().catch((err) => {
    logger.error("Failed to connect to database!", { message: err.message });
    throw new Error("Database connection failed.", err);
  });

  startDiscordSocket(env.LANYARD_URL); // Start lanyard and the websocket up

  queue.startWorkers(); // Start the job workers up

  Bun.serve({
    fetch(req, server) {
      // Upgrade WebSocket connections for the presence endpoint.
      if (new URL(req.url).pathname === ROUTES.presence) {
        if (server.upgrade(req, { data: {} })) return; // if upgrade was sucessfully return and let the presenceWebSocket handle it
      }
      return app.fetch(req); // for all other reqs, use Hono
    },
    websocket: presenceWebSocket,
    port: env.PORT,
    hostname: env.HOST,
    maxRequestBodySize: 4 * 1024 * 1024 * 1024, // 4GB to allow for video uploads
  });

  await universe.createUniverseScheduler();

  logger.info(`API running on http://${env.HOST}:${env.PORT}`);
};

export type AppType = typeof app;
export default { start };
