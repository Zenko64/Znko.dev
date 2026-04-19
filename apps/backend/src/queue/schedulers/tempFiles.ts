/**
 * @name TempFilesScheduler
 * @description The job schedulers for the temporary file stager.
 * It is responsible for the staging and cleanup process.
 * @module queue/schedulers/tempFiles
 * @file tempFiles.ts
 * @author Zenko
 */
import redis from "#core/redis";
import type { RedisTempFile } from "#types/redis";
import queues from "../queues";

// Configuration for the scheduler
const redisKey = (id: string) => `tempFiles:${id}`;
const DEFAULT_TTL_MS = 1000 * 60 * 60; // Uncommited staged files last 1 hour.

/**
 * @name scheduleTempfileCleanup
 * @description Records staged file metadata in Redis and schedules a delayed cleanup job.
 * Call {@link releaseTempFile} after the commit is sucessful.
 * @param file { fileId, filename, mimeType } - Metadata of the staged file.
 * @param userId Used for ownership verification during commit and cleanup.
 * @param cleanupMs Optional milliseconds til the file expires. Defaults to 1 hour.
 * @throws {AppError} If the scheduling process fails.
 * @async
 */
async function scheduleTempfileCleanup(
  file: { fileId: string; filename: string; mimeType: string },
  userId: number,
  cleanupMs: number = DEFAULT_TTL_MS,
) {
  await redis.setex(
    redisKey(file.fileId),
    Math.ceil(cleanupMs / 1000),
    JSON.stringify({
      userId,
      fileName: file.filename,
      mimeType: file.mimeType,
    } as RedisTempFile),
  );
  await queues.tempFilesCleanup.add(
    "UploadCleanup",
    { fileName: file.filename },
    { delay: cleanupMs, jobId: file.fileId },
  );
}

/**
 * @name getTempFile
 * @description Retrieves the staged file metadata from Redis.
 * Used for ownership verification during commit and cleanup.
 * @param fileId
 * @returns {Promise<RedisTempFile | null>} The metadata of the staged file, or null if not found.
 * @async
 */
async function getTempFile(fileId: string): Promise<RedisTempFile | null> {
  const raw = (await redis.get(redisKey(fileId))) as string | undefined;
  return raw ? (JSON.parse(raw) as RedisTempFile) : null;
}

/**
 * @name releaseTempFile
 * @description Clears the staged file metadata from Redis and cancels the scheduled cleanup job.
 * Call this after a commit to prevent the cleanup job from attempting to delete the file.
 * @param fileId The ID of the staged file to release.
 * @throws {AppError} If the release process fails.
 * @async
 */
async function releaseTempFile(fileId: string): Promise<void> {
  await redis.del(redisKey(fileId));
  queues.tempFilesCleanup.remove(fileId);
}

export default {
  scheduleTempfileCleanup,
  getTempFile,
  releaseTempFile,
};
