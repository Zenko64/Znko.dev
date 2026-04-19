/**
 * @name Workers
 * @description Defines the workers that process background jobs for the application.
 * @author Zenko
 */
import { Worker, type WorkerOptions } from "bunqueue/client";
import queues, {
  type TempFileJobData,
  type VideoProcessingJobData,
  queueConf,
} from "../queues";
import { deleteTempFromDisk } from "#core/storage";
import logger from "#core/logging";
import cleanUniverse from "#/queue/jobs/universe";
import transcode from "../jobs/transcoder";
import redis from "#core/redis";
import videosService from "#services/videos";
import pathOps from "#functions/paths";
import { rm } from "fs/promises";

const globalWorkerOptions: WorkerOptions = {
  embedded: queueConf.embedded,
  dataPath: queueConf.dataPath,
};

// Workers
const tempCleanup = new Worker<TempFileJobData>(
  queues.tempFilesCleanup.name,
  async (job) => {
    logger.info("Cleaning Up Temp File:", { fileName: job.data.fileName });
    await deleteTempFromDisk(job.data.fileName);
    logger.info("Deleted Temp File:", { fileName: job.data.fileName });
  },
  globalWorkerOptions,
);

export const universeCleanup = new Worker(
  queues.universeCleanup.name,
  async () => {
    await cleanUniverse().catch((err) => {
      logger.error(`Cleanup job failed: ${(err as Error).message}`);
    });
  },
  globalWorkerOptions,
);

export const videoProcessing = new Worker<VideoProcessingJobData>(
  queues.videoProcessing.name,
  async (job) => {
    const { videoNanoid, input, output } = job.data;
    const channel = `video:${videoNanoid}:progress`;
    const pub = (payload: object) =>
      redis.publish(channel, JSON.stringify(payload));

    logger.info("Processing video:", { videoNanoid });
    await transcode(
      input,
      output,
      (percent) => pub({ status: "processing", percent }),
      () => {
        videosService
          .updateVideo(videoNanoid, { status: "processing" })
          .catch((err) => {
            logger.error(
              `Failed to update video status: ${(err as Error).message}`,
            );
          });
        pub({ status: "processing" });
      },
      async (indexFile) => {
        await videosService
          .updateVideo(videoNanoid, {
            url: pathOps.urlFromPath(indexFile),
            status: "ready",
          })
          .catch((err) => {
            logger.error(
              `Failed to update video status: ${(err as Error).message}`,
            );
          });
        rm(input).catch(() => {});
        pub({ status: "ready" });
      },
    ).catch((err) => {
      pub({ status: "failed", message: (err as Error).message });
      logger.error(`Video processing failed: ${(err as Error).message}`);
    });
  },
  globalWorkerOptions,
);

export default { tempCleanup, universeCleanup, videoProcessing };
