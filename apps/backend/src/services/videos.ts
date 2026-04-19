/**
 * @name videos
 * @module services/videos
 * @description CRUD Service layer for the videos feature. Handles Database interactions and file management.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import tempOps from "#core/storage";
import { db } from "#db/index";
import { videos } from "#db/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";

//TODO: Analyse and JSDoc AND test

/**
 * @name createVideo
 * @description Inserts a new video record into the database.
 * @param video Video data to insert.
 * @returns The created video record.
 */
async function createVideo(
  video: Omit<typeof videos.$inferInsert, "id" | "createdAt" | "updatedAt">,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(videos).values(video).returning();
    const fullVideo = await tx.query.videos.findFirst({
      where: (v) => eq(v.id, created.id),
      with: {
        game: {
          columns: {
            id: false,
            uploaderId: false,
            order: false,
            createdAt: false,
            updatedAt: false,
          },
        },
        user: {
          columns: {
            id: false,
            createdAt: false,
            updatedAt: false,
            email: false,
          },
        },
      },
    });
    if (!fullVideo) {
      throw new Error("Failed to create the video.");
    }
    return fullVideo;
  });
}

/**
 * @name deleteVideo
 * @description Deletes a video record and its associated files from disk.
 * @param videoId The video's internal database ID.
 * @returns true if deleted, false if not found.
 * @throws {Error} If the deletion fails unexpectedly.
 */
async function deleteVideo(videoId: number) {
  try {
    const [deleted] = await db
      .delete(videos)
      .where(eq(videos.id, videoId))
      .returning();
    if (!deleted) return false;
    await tempOps.rmResourceDir({
      feature: "videos",
      nanoid: deleted.nanoid,
    });
    return true;
  } catch (err) {
    throw new Error(
      "Failed to delete video.",
      err instanceof Error ? { cause: err } : undefined,
    );
  }
}

/**
 * @name updateVideo
 * @description Updates a video's metadata fields by nanoid.
 * @param nanoid The video's public nanoid identifier.
 * @param data Partial video fields to update. File URLs and immutable fields are excluded.
 * @returns The updated video record, or undefined if not found.
 */
async function updateVideo(
  nanoid: string,
  data: Omit<
    Partial<typeof videos.$inferInsert>,
    "id" | "createdAt" | "updatedAt" | "uploaderId" | "nanoid"
  >,
) {
  return db.transaction(async (tx) => {
    const [updatedVid] = await tx
      .update(videos)
      .set(data)
      .where(and(eq(videos.nanoid, nanoid)))
      .returning();
    if (!updatedVid) return undefined;
    const fullVideo = await tx.query.videos.findFirst({
      where: (v) => eq(v.id, updatedVid.id),
      with: {
        game: {
          columns: {
            id: false,
            uploaderId: false,
            order: false,
            createdAt: false,
            updatedAt: false,
          },
        },
        user: {
          columns: {
            id: false,
            createdAt: false,
            updatedAt: false,
            email: false,
          },
        },
      },
    });
    if (!fullVideo) {
      throw new Error("Failed to retrieve the updated video.");
    }
    return fullVideo;
  });
}

/**
 * @name getVideo
 * @description Fetches a single video by nanoid with game and user relations.
 * Private videos are only returned if the requesting user is the uploader.
 * @param nanoid The video's public nanoid identifier.
 * @param userId The requesting user's ID. Required to access private videos.
 * @returns The video or undefined if not found or not accessible.
 */
async function getVideo(
  { id, nanoid }: { id?: number; nanoid?: string },
  userId?: number,
) {
  const video = await db.query.videos.findFirst({
    where: (v) =>
      and(
        id ? eq(v.id, id) : undefined,
        nanoid ? eq(v.nanoid, nanoid) : undefined,
        userId
          ? or(eq(v.uploaderId, userId), eq(v.public, true))
          : eq(v.public, true),
      ),
    with: {
      game: {
        columns: {
          id: false,
          order: false,
          createdAt: false,
          updatedAt: false,
        },
      },
      user: {
        columns: {
          id: false,
          email: false,
          createdAt: false,
          updatedAt: false,
        },
      },
    },
  });

  // Hide game info if the game isn't public
  if (video?.game && !video.game.public && video.game.uploaderId !== userId) {
    video.game = null;
  }

  return video;
}

/**
 * @name getVideos
 * @description Fetches videos visible to the user, with optional filtering.
 * @param filter Optional filters: uploadedBy (username), gameSlug, and query (search string).
 * @param userId The requesting user's ID. Includes their private videos if provided.
 * @returns Array of videos with game and user relations. Returns [] if a filter resolves to no results.
 */
async function getVideos(
  filter: {
    uploadedBy?: string;
    gameSlug?: string;
    query?: string;
  },
  userId?: number,
) {
  const { uploadedBy, gameSlug, query } = filter;
  const [resolvedUsernameId, gameId] = await Promise.all([
    uploadedBy
      ? db.query.users
          .findFirst({ where: (u) => eq(u.username, uploadedBy) })
          .then((r) => r?.id)
      : Promise.resolve(undefined),
    gameSlug
      ? db.query.games
          .findFirst({ where: (g) => eq(g.slug, gameSlug) })
          .then((r) => r?.id)
      : Promise.resolve(undefined),
  ]);

  if (uploadedBy && !resolvedUsernameId) return [];
  if (gameSlug && !gameId) return [];

  const result = await db.query.videos.findMany({
    where: (v) => {
      const conditions = [
        userId
          ? or(eq(v.uploaderId, userId), eq(v.public, true))
          : eq(v.public, true),
      ];
      if (gameId) conditions.push(eq(v.gameId, gameId));
      if (resolvedUsernameId)
        conditions.push(eq(v.uploaderId, resolvedUsernameId));
      if (query)
        conditions.push(
          or(
            ilike(v.title, `%${query}%`),
            ilike(v.description, `%${query}%`),
            ilike(sql`array_to_string(${v.tags}, ' ')`, `%${query}%`),
          )!,
        );
      return and(...conditions);
    },
    with: {
      game: {
        columns: {
          id: false,
          order: false,
          createdAt: false,
          updatedAt: false,
        },
      },
      user: {
        columns: {
          email: false,
          id: false,
          createdAt: false,
          updatedAt: false,
        },
      },
    },
  });

  // Drizzle relational `findMany` where filters apply to the root table only,
  // not to joined relations, so the game.public filter must be done in application code.
  for (const video of result) {
    if (video.game && !video.game.public && video.game.uploaderId !== userId) {
      video.game = null;
    }
  }

  return result;
}

export default {
  createVideo,
  deleteVideo,
  updateVideo,
  getVideo,
  getVideos,
};
