import { db } from "#db/index";
import { dirStruct } from "#/constants";
import logger from "#core/logging";
import { gameMedia, games, postMedia, users, videos } from "#db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { ROUTES } from "@znko/consts";
import tempOps from "#core/storage";
import pathOps from "#functions/paths";
import fs from "fs/promises";
import { join, resolve, sep } from "path";
import queues from "#/queue/queues";
import { Dirent } from "fs";

//TODO: Comment more cases and anti race condition stuff

interface FileEntry {
  dirent: Dirent;
  isTemp: boolean;
  isFresh: boolean;
  urlUploadPath: string;
}

// Files modified within this period are considered fresh, and are skipped during cleanup.
const MTIME_GRACE_MS = 10 * 60 * 1000;

async function cleanUniverse() {
  const now = Date.now();

  const dirEntries = (
    await fs.readdir(dirStruct.uploads, {
      recursive: true,
      withFileTypes: true,
    })
  ).filter((f) => f.isFile());

  // Acquire all files and references
  const dbFilesArr = await unionAll(
    db.select({ url: sql<string | null>`${postMedia.url}` }).from(postMedia),
    db.select({ url: sql<string | null>`${games.coverImgUrl}` }).from(games),
    db.select({ url: sql<string | null>`${games.heroImgUrl}` }).from(games),
    db.select({ url: sql<string | null>`${gameMedia.url}` }).from(gameMedia),
    db.select({ url: sql<string | null>`${videos.url}` }).from(videos),
    db.select({ url: sql<string | null>`${videos.thumbnailUrl}` }).from(videos),
    db.select({ url: sql<string | null>`${users.avatarUrl}` }).from(users),
  ).then((r) =>
    r
      .filter((r) => r.url?.startsWith(ROUTES.uploads + "/"))
      .map((r) => r.url as string),
  );

  const dbFiles = new Set(dbFilesArr);

  const fsFiles = await Promise.all(
    dirEntries.map(async (f) => {
      const fullPath = join(f.parentPath, f.name);
      const stat = await fs.stat(fullPath);
      return {
        dirent: f,
        isTemp: resolve(f.parentPath) === tempOps.tempDir,
        isFresh: now - stat.mtimeMs < MTIME_GRACE_MS,
        urlUploadPath: pathOps.urlFromPath(fullPath),
      };
    }),
  );

  const fsUrls = new Set(
    fsFiles.filter((f) => !f.isTemp).map((f) => f.urlUploadPath),
  );

  await Promise.all([
    universeTempcheck(fsFiles),
    universeOrphanRecordCheck(dbFilesArr, fsUrls),
    universeOrphanFileCheck(fsFiles, dbFiles),
  ]);
}

async function universeTempcheck(fsFiles: FileEntry[]) {
  const pendingTempNames = new Set(
    queues.tempFilesCleanup
      .getJobs({ state: ["delayed", "waiting", "active"] })
      .map((j) => j.data.fileName),
  );

  // Temp files with no scheduled job — delete individually
  const orphanedTempFiles = fsFiles
    .filter((f) => f.isTemp && !pendingTempNames.has(f.dirent.name))
    .map((f) => f.dirent);

  await Promise.all(
    orphanedTempFiles.map(async (file) => {
      try {
        await fs.unlink(join(file.parentPath, file.name));
        logger.info(`Deleted orphaned temp file: ${file.name}`);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            `Failed to delete temp file ${file.name}: ${(err as Error).message}`,
          );
        }
      }
    }),
  );
}

async function universeOrphanFileCheck(
  fsFiles: FileEntry[],
  dbFiles: Set<string>,
) {
  const getOrphanedDirs = (
    nonTempFiles: typeof fsFiles,
    dbUrlPaths: Set<string>,
  ): string[] => {
    const referencedUrlPaths = new Set(
      nonTempFiles
        .filter((f) => dbUrlPaths.has(f.urlUploadPath) || f.isFresh)
        .map((f) => resolve(f.dirent.parentPath)),
    );
    const allDirs = new Set(
      nonTempFiles.map((f) => resolve(f.dirent.parentPath)),
    ); // Get all parent paths from all files

    return [...allDirs].filter(
      (dir) =>
        !referencedUrlPaths.has(dir) &&
        ![...referencedUrlPaths].some((ref) => dir.startsWith(ref + sep)),
    );
  };

  // ! Exclude videos that are being processed
  const processingVideoDirs = new Set(
    (
      await db
        .select({ nanoid: videos.nanoid })
        .from(videos)
        .where(inArray(videos.status, ["pending", "processing"]))
    ).map((v) => resolve(join(dirStruct.uploads, "videos", v.nanoid))),
  );

  const nonTempFiles = fsFiles.filter((f) => !f.isTemp);
  const orphanedDirs = getOrphanedDirs(nonTempFiles, dbFiles).filter(
    (dir) => !processingVideoDirs.has(dir),
  );

  await Promise.all(
    orphanedDirs.map(async (dir) => {
      try {
        await fs.rm(dir, { recursive: true });
        logger.info(`Deleted orphaned directory: ${dir}`);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            `Failed to delete directory ${dir}: ${(err as Error).message}`,
          );
        }
      }
    }),
  );
}

async function universeOrphanRecordCheck(
  dbFilesArr: string[],
  fsUrls: Set<string>,
) {
  const orphanedRecords = dbFilesArr.filter((dbf) => !fsUrls.has(dbf));
  await db.transaction(async (tx) => {
    await Promise.all(
      orphanedRecords.map(async (url) => {
        await tx.delete(postMedia).where(eq(postMedia.url, url));
        await tx.delete(gameMedia).where(eq(gameMedia.url, url));
        await tx.delete(videos).where(eq(videos.url, url));
        await tx.delete(videos).where(eq(videos.thumbnailUrl, url));
        await tx
          .update(users)
          .set({ avatarUrl: null })
          .where(eq(users.avatarUrl, url));
        await tx
          .update(games)
          .set({ coverImgUrl: null })
          .where(eq(games.coverImgUrl, url));
        await tx
          .update(games)
          .set({ heroImgUrl: null })
          .where(eq(games.heroImgUrl, url));
      }),
    );
  });
}

export default cleanUniverse;
