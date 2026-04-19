/**
 * @name errorHandler
 * @description Middleware to handle errors and return appropriate JSON responses.
 * @file middleware/errorHandler.ts
 * @module middleware/errorHandler
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "#core/errors";
import logger from "#core/logging";

/**
 * Handles errors and returns a JSON response with the appropriate status code.
 * @param err - The error object.
 * @param c - The context object.
 * @returns A JSON response with the error message and status code.
 */
function errorHandler(err: unknown, c: Context): Response {
  if (err instanceof AppError) {
    logger.log(
      err.logLevel,
      `[${err.statusCode}] ${err.message}`,
      err.meta ?? {},
    );

    return c.json(
      { error: err.message },
      err.statusCode as ContentfulStatusCode,
    );
  }
  logger.error("Unhandled error", err);
  return c.json({ error: "An unknown error has occurred." }, 500);
}

export default errorHandler;
