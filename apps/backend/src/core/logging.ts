/**
 * @name Logger
 * @description Logging configuration using Winston.
 * - In development, logs are colorized and include timestamps and stack traces for errors.
 * - In production, logs are in JSON format with timestamps and stack traces for errors.
 * - The log level can be set via the LOG_LEVEL environment variable.
 * - All logs are outputted to the console.
 * @module core/logging
 * @requires winston
 * @requires env
 * @see core/errors
 * @see middleware/errorHandler
 * @author Zenko
 * @version 1.0.0
 * OK
 * TODO: Check if this is super stylish
 */
import winston from "winston";
import { env } from "./env";

const { combine, timestamp, colorize, printf, json, errors } = winston.format; // Destrucutre the formatting functions

// Dev Format for Error Logging, includes stack tracing and JSON metadata..
const devFormat = combine(
  errors({ stack: true }),
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const { trace, ...restMeta } = meta as { trace?: string } & Record<
      string,
      unknown
    >;
    const metaStr = Object.keys(restMeta).length
      ? `\n  ${JSON.stringify(restMeta, null, 2).replace(/\n/g, "\n  ")}`
      : "";
    const traceStr = trace ?? stack;
    const traceOut = traceStr ? `\n${traceStr}` : "";
    return `{${timestamp}} [${level}]: ${message}${metaStr}${traceOut}`;
  }),
);

const prodFormat = combine(errors({ stack: true }), timestamp(), json()); // Production Error Logging format

// Create the logger instance
const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
