/**
 * @name Storage
 * @description This module is responsible for staging temporary files and commiting them to their final destination.
 * The process works like this:
 * - User Uploads a File, which is then staged using `stageTempFile`.
 * - A record is created in Redis and a cleanup job is scheduled to remove the file after an hour.
 * - The user gets a unique file key (temp_{nanoid}).
 * - The user sends the file key along with their data. The route calls `commitTempFile`.
 * - The file is moved to its final location, the Redis record is removed, and the cleanup job is cancelled.
 * - If the file is not committed, it automatically is deleted and the Redis record is removed.
 * @module core/tempFiles
 * @file tempFiles.ts
 * @author Zenko
 * @version 1.0.0
 * OK
 */
import { AppError } from "#core/errors";
import tempScheduler from "#/queue/schedulers/tempFiles";
import { shapes } from "@znko/types";
import pathOps from "#functions/paths";
import { getExtension } from "hono/utils/mime";
import { randomBytes, randomUUID } from "crypto";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import { join, resolve, sep } from "path";
import z from "zod";
import fileOps from "#functions/files";
import { dirStruct, baseUploadsFolders } from "#/constants";
import logger from "./logging";

async function safeRm(
  path: string,
  opts?: Parameters<typeof fs.rm>[1],
): Promise<void> {
  try {
    await fs.rm(path, opts);
  } catch (err) {
    if ((err as ErrnoException).code === "ENOENT") return;
    throw err;
  }
}

export type Features = "posts" | "games" | "users" | "videos";
type FileCategory =
  | "avatar"
  | "thumbnail"
  | "video"
  | "cover"
  | "hero"
  | "media";

type SavedFile = { url: string; mimeType: string };

const { imageMime, videoMime } = shapes.api.mime;
const CATEGORY_MIMES_SCHEMA: Record<
  // Access this to validate the MIME Types of the file.
  Features,
  Partial<Record<FileCategory, z.ZodType>>
> = {
  users: { avatar: imageMime },
  games: {
    cover: imageMime,
    hero: imageMime,
    media: z.union([imageMime, videoMime]),
  },
  videos: { video: videoMime, thumbnail: imageMime },
  posts: {
    media: z.union([
      imageMime,
      videoMime,
      z.enum(["application/zip", "text/plain"]),
    ]),
  },
};

const tempDir = resolve(join(dirStruct.uploads, "temp"));

export async function ensureUniverse() {
  const throwCritical = (err: ErrnoException) => {
    if (err.code !== "EEXIST") {
      logger.error("Failed to initialize storage directories", { error: err });
      throw new Error("Failed to initialize storage.");
    }
  };

  await fs.mkdir(dirStruct.root, { recursive: true }).catch(throwCritical);
  await Promise.all(
    [...baseUploadsFolders].map((folder) =>
      fs
        .mkdir(join(dirStruct.uploads, folder), { recursive: true })
        .catch(throwCritical),
    ),
  ).catch(throwCritical);
}

async function rmResourceDir({
  feature,
  nanoid,
}: {
  feature: Features;
  nanoid: string;
}): Promise<void> {
  await safeRm(resolve(join(dirStruct.uploads, feature, nanoid)), {
    recursive: true,
  });
}

/**
 * Stage a temporary file.
 * The file is automatically cleaned up after an hour.
 * @param body The file content as a BodyInit (Blob, BufferSource, FormData, etc.)
 * @param meta Metadata about the file.
 * @param userId Used for ownership verification.
 * @returns {string} temp_{nanoid} - The Unique Key, used for later interactions.
 * @throws {AppError} If the staging process fails.
 * @async
 */
async function stageTempFile(
  body: BodyInit,
  meta: { mimeType: string; ext: string },
  userId: number,
): Promise<string> {
  const fileName = randomBytes(16).toString("hex") + "." + meta.ext;
  const id = `temp_${nanoid()}`;

  await Bun.write(join(tempDir, fileName), new Response(body));
  await tempScheduler.scheduleTempfileCleanup(
    { fileId: id, filename: fileName, mimeType: meta.mimeType },
    userId,
  );

  return id;
}

/**
 * @name withCommit
 * @description Automatically track committed files and cleanUp if an error in the entire process occurs.
 * @param fn
 */
async function withCommit<T>(
  fn: (
    commit: typeof commitTempFile,
    commitAll: typeof commitMany,
  ) => Promise<T>,
): Promise<T> {
  const tracked: string[] = [];

  try {
    const commitTempFileHelper: typeof commitTempFile = async (...args) => {
      const result = await commitTempFile(...args);
      tracked.push(result.url);
      return result;
    };
    const commitManyHelper: typeof commitMany = async (...args) => {
      const result = await commitMany(...args);
      tracked.push(...result.map((f) => f.url));
      return result;
    };

    // Return the datatype (anything) returned by the callback function.
    return await fn(commitTempFileHelper, commitManyHelper);
  } catch (err) {
    await Promise.all(tracked.map((url) => fileOps.unlinkFileByUrl(url))).catch(
      () => {},
    );
    throw err;
  }
}

/**
 * Commit multiple staged temporary files.
 * @param keys An array of temp file keys to commit.
 * @param dest The destination details for the files.
 * @param userId Used for ownership verification.
 * @returns An array of saved file details (URL and MIME Type).
 * @throws {AppError} If any of the files fail to commit.
 * @async
 */
async function commitMany(
  keys: string[],
  dest: {
    feature: Features;
    resourceNanoid: string;
    fileCategory: FileCategory;
  },
  userId: number,
): Promise<SavedFile[]> {
  return await Promise.all(
    keys
      .filter((k) => k.startsWith("temp_"))
      .map(async (k) => await commitTempFile(k, dest, userId)),
  );
}

/**
 * Move a staged temporary file to its final destination and return its URL.
 * Also removes the staging record, clears the scheduled cleanup, and removes the Redis entry.
 * @param fileKey The key linked to the staged file. temp_{nanoid}
 * @param dest { feature, resourceNanoid, fileCategory } - File destination details
 * @param userId Used for ownership verification
 */
async function commitTempFile(
  fileKey: string,
  dest: {
    feature: Features;
    resourceNanoid: string;
    fileCategory: FileCategory;
  },
  userId: number,
): Promise<SavedFile> {
  const meta = await tempScheduler.getTempFile(fileKey); // Retrieve staging file metadata from Redis
  if (!meta || meta.userId !== userId) {
    throw new AppError("The pending file was not found.", 404);
  }

  // Verify if the file exists and is valid.
  const src = resolve(join(tempDir, meta.fileName));
  if (!src.startsWith(tempDir + sep)) {
    throw new AppError("The Filepath is invalid.", 400); // This should never happen, but it is good to check nevertheless.
  }
  await fs.stat(src).catch(() => {
    throw new AppError("Staged file not found.", 404);
  });

  // Validate that the file's MIME Type is valid.
  const schema = CATEGORY_MIMES_SCHEMA[dest.feature]?.[dest.fileCategory];
  if (!schema || !schema.safeParse(meta.mimeType).success) {
    throw new AppError("Invalid file type.", 400);
  }

  const ext = getExtension(meta.mimeType); // Get the file extension based on MIME
  if (!ext) throw new AppError("Invalid file extension.", 400);

  // Proceed with commiting the file
  const { feature, resourceNanoid, fileCategory } = dest;
  const relPath = join(
    feature,
    resourceNanoid,
    `${fileCategory}-${randomUUID()}.${ext}`,
  ).replace(/\\/g, "/");

  await fs.mkdir(join(dirStruct.uploads, feature, resourceNanoid), {
    recursive: true,
  });
  const destPath = join(dirStruct.uploads, relPath);
  await fs.rename(src, destPath);
  await tempScheduler.releaseTempFile(fileKey);

  return { url: pathOps.urlFromPath(destPath), mimeType: meta.mimeType };
}

/**
 * Remove a temporary file from the disk.
 * @name deleteTempFromDisk
 * @param fileName
 * @returns Promise
 * @throws {AppError} If the file exists and cannot be deleted
 * @async
 */
export async function deleteTempFromDisk(fileName: string): Promise<void> {
  await safeRm(join(tempDir, fileName));
}

export default {
  rmResourceDir,
  withCommit,
  commitMany,
  stageTempFile,
  commitTempFile,
  deleteTempFromDisk,
  tempDir,
};
