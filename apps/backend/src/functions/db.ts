/**
 * @name DbFunctions
 * @module functions/db
 * @description Database utility functions for handling complex operations and transactions.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import { shapes } from "@znko/types";
import { db } from "#db/index";
import { gameMedia, postMedia } from "#db/schema";
import { and, eq, or } from "drizzle-orm";
import z from "zod";
import fileOps from "./files";

type MediaItem = z.infer<typeof shapes.api.response.mediaItem>;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MediaTables = typeof gameMedia | typeof postMedia;

/**
 * @name syncItemMedia
 * @description Synchronizes media items with the supported table (game or post) by comparing the given media data with existing db media entries. It diffs media and also cleans the filesystem up.
 * @param tx The Database Transaction. Required to guarantee operation atomicity.
 * @param table The media table to sync
 * @param mediaData The new media data to sync with the db and the fs
 * @param ownerId The ID of the media owner
 * @throws {Error} if there's a failure or the input data is invalid.
 * @returns Promise<void>
 * @async
 * OK
 */
async function syncItemMedia(
  tx: Transaction,
  table: MediaTables,
  mediaData: MediaItem[],
  ownerId: number,
) {
  const fkey =
    table === gameMedia
      ? gameMedia.gameId
      : table === postMedia
        ? postMedia.postId
        : undefined;

  if (!fkey) {
    throw new Error("Invalid media table provided");
  }

  if (mediaData) {
    const existingMedia = await tx
      .select()
      .from(table)
      .where(eq(fkey, ownerId));

    if (existingMedia.length > 0) {
      const removedMediaArray = existingMedia.filter(
        (dbMedia) =>
          !mediaData.some((newMedia) => newMedia.url === dbMedia.url),
      );
      if (removedMediaArray.length > 0) {
        await tx
          .delete(table)
          .where(
            and(
              eq(fkey, ownerId),
              or(
                ...removedMediaArray.map((removedMedia) =>
                  eq(table.url, removedMedia.url),
                ),
              ),
            ),
          );

        await Promise.all(
          removedMediaArray.map((media) => fileOps.unlinkFileByUrl(media.url)), // Delete diffed out media files from the fs.
        );
      }
    }

    const newMedia = mediaData.filter(
      (newMedia) =>
        !existingMedia.some((dbMedia) => dbMedia.url === newMedia.url),
    );

    if (newMedia.length > 0) {
      await tx.insert(table).values(
        newMedia.map((media) => ({
          ...(table === gameMedia
            ? { gameId: ownerId }
            : table === postMedia
              ? { postId: ownerId }
              : {}),
          ...media,
        })),
      );
    }
  }
}

export default {
  syncItemMedia,
};
