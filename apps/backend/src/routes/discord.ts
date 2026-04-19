/**
 * @name presenceHandler
 * @description This module is responsible for handling basic HTTP GET requests to the presence API.
 * It does not do websocket.
 * @module routes/discord
 * @author Zenko
 * @version 1.0.0
 * OK
 */
import type { AppContext } from "#types/hono";
import { AppError } from "#core/errors";
import { getCachedPresence } from "#services/discord";

/**
 * @name presenceHandler
 * @description This function handles GET requests to the presence API.
 * It responds with the cached presence data and returns it as a JSON response.
 * If the presence data is not yet loaded, it returns a 503 error.
 * @param c
 * @returns Response
 * @exports
 * @throws AppError
 */
export function presenceHandler(c: AppContext): Response {
  const cachedData = getCachedPresence();
  if (!cachedData) {
    throw new AppError("Discord presence not yet loaded.", 503);
  }

  return c.json(cachedData);
}


export type DiscordType = typeof presenceHandler;