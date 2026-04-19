/**
 * @name Queue Index
 * @description Barrel export for the queue system.
 * Re-exports queue instances, configuration, types, and worker utilities.
 * Import queue instances from "#/queue/queues" directly if you are in a module
 * that workers transitively depend on (to avoid circular imports).
 * @module queue
 */
import workers from "./workers/index";
import queues, { queueConf, schedulerDataPath } from "./queues";
export type { TempFileJobData } from "./queues";

function startWorkers() {
  Object.values(workers).forEach((worker) => worker.run());
}

export default {
  startWorkers,
  queues,
  workers,
  options: { schedulerDataPath, queueConf },
};
