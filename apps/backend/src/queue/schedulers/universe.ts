/**
 * @file Universe Scheduler
 * @description This module sets up a scheduled job for cleaning up orphaned files in the universe storage.
 * The scheduler is configured to run every 6 hours, but this can be adjusted as needed.
 * @module queue/schedulers/universe
 * @author Zenko
 * OK
 */
import queuesStruct from "..";
const { queues } = queuesStruct;

// Scheduler Configuration
const UNIVERSE_CLEANUP_CRON = "0 */6 * * *";

/**
 * @name createUniverseScheduler
 * @description Initializes the universe cleanup job scheduler with the specified cron pattern.
 * @param cronPattern A cron pattern that defines the schedule for the cleanup job. Defaults to every 6 hours.
 * @returns void
 */
async function createUniverseScheduler(
  cronPattern: string = UNIVERSE_CLEANUP_CRON,
) {
  console.log(queues.universeCleanup.name);
  await queues.universeCleanup.upsertJobScheduler(queues.universeCleanup.name, {
    pattern: cronPattern,
  });
  await queues.universeCleanup.add("Universe Cleanup", {});
}

export default {
  createUniverseScheduler,
};
