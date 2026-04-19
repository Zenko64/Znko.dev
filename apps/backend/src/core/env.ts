/**
 * @name Environment Variables
 * @description This module is responsible for validating and exporting environment variables used in the app.
 * It ensures that every required environment variable is set and valid before the server starts.
 * This should be imported in the Server Entry point to provide the side effect.
 * @author Zenko
 * @version 1.0.0
 * OK
 * TODO: Check improvements and try to add health checks for the variables before full appstart, add a startup banner, make this cool.
 */

import z from "zod";
import os from "os";

const ifaces = os.networkInterfaces();
const addresses = Object.values(ifaces)
  .flat()
  .map((iface) => iface?.address);

const envSchema = z.object({
  HOST: z
    .string()
    .default("127.0.0.1")
    .refine((val) => val === "0.0.0.0" || addresses.includes(val), {
      message: "HOST must be a valid local IP address or 0.0.0.0",
    }),
  PORT: z
    .string()
    .default("4000")
    .transform(Number)
    .refine((val) => val > 0 && val < 65536, {
      message: "PORT must be a valid port number.",
    }),
  APP_URL: z.url(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long."),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  REDIS_URL: z.string().min(1, "REDIS_URL is required."),
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1, "OIDC_CLIENT_ID is required."),
  OIDC_CLIENT_SECRET: z.string().min(1, "OIDC_CLIENT_SECRET is required."),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LANYARD_URL: z.string().min(1).default("wss://api.lanyard.rest"),
  TRUSTED_PROXIES: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((ip) => ip.trim()) : []))
    .pipe(
      z.array(
        z.ipv4({
          message:
            "TRUSTED_PROXIES must be a comma-separated list of valid IP addresses.",
        }),
      ),
    ),
});

export const env = envSchema.parse(process.env);
