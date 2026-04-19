import queueStruct from "#/queue";
import logger from "#core/logging";
import cleanUniverse from "#/queue/jobs/universe";
const { queues } = queueStruct;

const command = process.argv[2];

switch (command) {
  case "clean": {
    logger.info("Starting System Cleanup...");
    await cleanUniverse();
    logger.info("Orphaned Files Cleanup Completed.");
    logger.info("Clearing Temp Files...");

    const jumpstarted = await queues.tempFilesCleanup.promoteJobs();
    logger.info("Temp Files Cleanup Jobs Promoted:", { count: jumpstarted });
    process.exit(0);
  }
  default:
    console.log(`Unknown command: ${command}`);
    console.log("Available commands: clean");
    process.exit(1);
}
