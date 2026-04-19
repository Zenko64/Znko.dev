import logger from "#core/logging";
import server from "#core/server";
import { ensureUniverse } from "#core/storage";

listenAppEvents().catch((err) => {
  logger.error("Failed to set up event listeners!", { message: err.message });
  process.exit(1);
});


server.start().catch((err) => {
  logger.error("Failed to start server!", { message: err.message });
  process.exit(1);
});

await ensureUniverse();

async function listenAppEvents() {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    if (reason instanceof Error) {
      logger.error("Unhandled rejection", {
        message: reason.message,
        stack: reason.stack,
      });
    } else {
      logger.error("Unhandled rejection", { reason });
    }
    process.exit(1);
  });
}
