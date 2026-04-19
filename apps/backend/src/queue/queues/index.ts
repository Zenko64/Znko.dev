/**
 * @name Queue Definitions
 * @description Queue instances and shared configuration.
 * Kept separate from the barrel index to avoid circular dependencies:
 * workers → universe.ts → queues (must not re-enter the barrel that imports workers).
 * @module queue/queues
 */
import { Queue, type QueueOptions } from "bunqueue/client";

export interface TempFileJobData {
  fileName: string;
}

export interface VideoProcessingJobData {
  videoNanoid: string;
  input: string;
  output: string;
}

export const schedulerDataPath = "./data/jobs.db";

export const queueConf: QueueOptions = {
  embedded: true,
  dataPath: process.env.DATA_PATH
    ? `${process.env.DATA_PATH}/jobs.db`
    : schedulerDataPath,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
};

const tempFilesCleanup = new Queue<TempFileJobData>("tempFilesCleanup", {
  ...queueConf,
  defaultJobOptions: {
    delay: 1000 * 60 * 60,
    removeOnComplete: true,
  },
});

const universeCleanup = new Queue("universeCleanup", { ...queueConf });

const videoProcessing = new Queue<VideoProcessingJobData>("videoProcessing", {
  ...queueConf,
});

export default { tempFilesCleanup, universeCleanup, videoProcessing };
