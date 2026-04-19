/**
 * @name Redis Singleton
 * @description This module initializes the Redis Client and exports it as a singleton.
 * It connects to the Redis server using the URL specified in the environment variables.
 * If the connection fails, it logs the error and exits the process.
 * @author Zenko
 * @module core/redis
 * OK
 **/
import { RedisClient } from "bun";
import { env } from "#core/env";
import logger from "#core/logging";

const redis = new RedisClient(env.REDIS_URL);

await redis.connect().catch((err: Error) => {
  logger.error("Failed to connect to Redis!", { message: err.message });
  process.exit(1);
});

export default redis;
