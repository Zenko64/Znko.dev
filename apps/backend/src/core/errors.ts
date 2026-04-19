/**
 * @name Error Classes
 * @description This file contains custom error classes for the application.
 * These classes can be used to throw specific errors in the application, and can be caught by error handling middleware.
 * This allows for better error handling and debugging in the application.
 * @author Zenko
 * @version 1.0.0
 * @module core/errors
 * @see middleware/errorHandler
 * @see core/logging
 * OK
 */

import type { StatusCode } from "hono/utils/http-status";

export type LogLevel = "error" | "warn" | "info" | "http" | "debug";

/**
 * @name AppError
 * @description A custom error that should be catched by the middleware, and sent to the client with the message and status code.
 * @param message - The error message to be displayed when the error is thrown.
 * @param statusCode - The HTTP status code associated with the error.
 * @param meta - Optional metadata that can be included with the error for additional context.
 * @param logLevel - The log level for the error, which can be used to determine how the error should be logged (defaults to "error" for 5xx, "warn" for 4xx).
 * @returns An instance of the AppError class.
 */
export class AppError extends Error {
  statusCode: StatusCode;
  logLevel: LogLevel;
  meta?: Record<string, unknown>;
  constructor(
    message: string,
    statusCode: StatusCode,
    meta?: Record<string, unknown>,
    logLevel?: LogLevel,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.logLevel = logLevel ?? (statusCode >= 500 ? "error" : "warn");
    this.meta = meta;
  }
}
