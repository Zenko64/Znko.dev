/**
 * @file games.ts
 * @name gamesService
 * @module services/games
 * @description CRUD Service layer for the games feature. Handles database interactions and file management.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import { db } from "#db/index";
import { gameMedia, games, users } from "#db/schema";
import { and, asc, eq, ilike, max, or } from "drizzle-orm";
import slug from "slug";
import z from "zod";
import { shapes } from "@znko/types";
import dbOps from "#functions/db";
import tempOps from "#core/storage";

type MediaItem = z.infer<typeof shapes.api.response.mediaItem>;

//TODO: Analyse and JSDoc

/**
 * @name postGame
 * @description Creates a new game with optional media attachments in a single transaction.
 * Automatically assigns a slug from the title and an order after the current last game.
 * @param game Game data to insert.
 * @param gameMediaData Optional media items to attach to the game.
 * @returns The created game with media relations.
 */
async function postGame(
  game: Omit<typeof games.$inferInsert, "slug" | "createdAt" | "updatedAt">,
  gameMediaData?: MediaItem[],
) {
  return await db.transaction(async (tx) => {
    const [{ maxOrder }] = await tx
      .select({ maxOrder: max(games.order) })
      .from(games);
    const nextOrder = (maxOrder ?? -1) + 1;

    const newGame = await tx
      .insert(games)
      .values({ ...game, slug: slug(game.title), order: nextOrder })
      .returning();

    if (gameMediaData && gameMediaData.length > 0) {
      await tx
        .insert(gameMedia)
        .values(
          gameMediaData.map((file) => ({
            gameId: newGame[0].id,
            ...file,
          })),
        )
        .returning();
    }

    return await tx.query.games.findFirst({
      where: eq(games.id, newGame[0].id),
      columns: { createdAt: false, updatedAt: false },
      with: {
        gameMedia: { columns: { url: true, mimeType: true } },
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
  });
}

/**
 * @name getGames
 * @description Fetches games visible to the user, with optional filtering by uploader and search query.
 * @param filter Optional filters: uploadedBy (username) and query (search string).
 * @param userId The requesting user's ID. Includes their private games if provided.
 * @returns Array of games with media relations. Returns [] if a filter resolves to no results.
 */
async function getGames(
  filter: {
    uploadedBy?: string;
    query?: string;
  },
  userId?: number,
) {
  const { uploadedBy, query } = filter;
  const resolvedUsernameId = uploadedBy
    ? await db.query.users
        .findFirst({
          where: eq(users.username, uploadedBy),
        })
        .then((u) => u?.id)
    : null;

  if (uploadedBy && !resolvedUsernameId) {
    return [];
  }

  return await db.query.games.findMany({
    where: (g) => {
      const conditions = [
        userId
          ? or(eq(games.public, true), eq(games.uploaderId, userId))
          : eq(games.public, true),
      ];
      if (query) {
        conditions.push(
          or(
            ilike(g.slug, `%${query}%`),
            ilike(g.title, `%${query}%`),
            ilike(g.description, `%${query}%`),
            ilike(g.tags, `%${query}%`),
          ),
        );
      }
      if (uploadedBy) {
        conditions.push(eq(g.uploaderId, resolvedUsernameId!));
      }
      return and(...conditions);
    },
    columns: {
      createdAt: false,
      updatedAt: false,
    },
    orderBy: [asc(games.order)],
    with: {
      gameMedia: {
        columns: {
          url: true,
          mimeType: true,
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
}

/**
 * @name getGame
 * @description Fetches a single game by slug with media relations.
 * Visibility is enforced at the route layer via assertExistsAndOwns.
 * @param slug The game's URL slug.
 * @returns The game or undefined if not found.
 */
async function getGame(
  {
    id,
    nanoid,
    slug: gameSlug,
  }: { id?: number; nanoid?: string; slug?: string },
  userId?: number,
) {
  return await db.query.games.findFirst({
    where: (game) =>
      and(
        nanoid ? eq(game.nanoid, nanoid) : undefined,
        id ? eq(game.id, id) : undefined,
        gameSlug ? eq(game.slug, gameSlug) : undefined,
        userId !== undefined
          ? or(eq(game.uploaderId, userId), eq(game.public, true))
          : eq(game.public, true),
      ),
    with: {
      gameMedia: {
        columns: {
          id: false,
          gameId: false,
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
}

/**
 * @name patchGame
 * @description Updates a game's fields and optionally syncs its media in a single transaction.
 * @param gameSlug The game's current slug.
 * @param gameData Partial game fields to update.
 * @param gameMediaData If provided, syncs media to match this array (adds new, removes missing).
 * @returns The updated game with media relations, or undefined if not found.
 */
async function patchGame(
  nanoid: string,
  gameData: Partial<
    Omit<typeof games.$inferInsert, "createdAt" | "updatedAt" | "uploaderId">
  >,
  gameMediaData?: MediaItem[],
) {
  return await db.transaction(async (tx) => {
    const [updatedGame] = await tx
      .update(games)
      .set({
        slug: gameData.slug,
        title: gameData.title,
        description: gameData.description,
        tags: gameData.tags,
        rating: gameData.rating,
        coverImgUrl: gameData.coverImgUrl,
        heroImgUrl: gameData.heroImgUrl,
        launchDate: gameData.launchDate,
        pinned: gameData.pinned,
        public: gameData.public,
      })
      .where(eq(games.nanoid, nanoid))
      .returning();

    if (!updatedGame) {
      throw new Error("The specified game was not found.");
    }

    if (gameMediaData) {
      await dbOps.syncItemMedia(tx, gameMedia, gameMediaData, updatedGame.id);
    }

    return await tx.query.games.findFirst({
      where: eq(games.id, updatedGame.id),
      columns: { createdAt: false, updatedAt: false },
      with: {
        gameMedia: { columns: { url: true, mimeType: true } },
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
  });
}

/**
 * @name reorderGames
 * @description Updates the display order of multiple games at once.
 * @param nanoids Ordered array of game nanoids. Each game's order is set to its index.
 */
async function reorderGames(nanoids: string[]) {
  await db.transaction(async (tx) => {
    await Promise.all(
      nanoids.map((n, index) =>
        tx.update(games).set({ order: index }).where(eq(games.nanoid, n)),
      ),
    );
  });
}

/**
 * @name deleteGame
 * @description Deletes a game, its media records, and all associated files from disk.
 * DB deletion happens first to avoid orphaned records; file deletion is best-effort.
 * @param nanoid The game's unique identifier.
 * @returns true if deleted, false if not found.
 */
async function deleteGame(nanoid: string) {
  const game = await db.query.games.findFirst({
    where: eq(games.nanoid, nanoid),
    columns: { id: true, nanoid: true },
  });
  if (!game) return false;

  await db.transaction(async (tx) => {
    await tx.delete(gameMedia).where(eq(gameMedia.gameId, game.id));
    await tx.delete(games).where(eq(games.nanoid, nanoid));
  });

  await tempOps
    .rmResourceDir({
      feature: "games",
      nanoid,
    })
    .catch(() => {});
  return true;
}

export default {
  getGame,
  postGame,
  getGames,
  patchGame,
  deleteGame,
  reorderGames,
};
