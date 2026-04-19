import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "#middleware/requireAuth";
import gamesService from "#services/games";
import sensitive from "#security/sensitive";
import { shapes } from "@znko/types";
import { assertExistsAndOwns, getAuthUser } from "#security/ownership";
import { AppError } from "#core/errors";
import tempOps from "#core/storage";
import fileOps from "#functions/files";
import slug from "slug";
import type { AppEnv } from "#types/hono";
import { nanoid as mkNanoid } from "nanoid";
import z from "zod";

type MediaItem = z.infer<typeof shapes.api.response.mediaItem>;

export const gamesRouter = new Hono<AppEnv>()
  .get("/", zValidator("query", shapes.api.request.gamesQuery), async (c) => {
    // OK
    const uploadedBy = c.req.query("uploadedBy") ?? undefined;
    const searchQuery = c.req.query("search") ?? undefined;
    try {
      const gamesList = await gamesService.getGames(
        { uploadedBy: uploadedBy, query: searchQuery },
        c.var.session.userId,
      );
      return c.json(
        gamesList.map((g) => ({
          ...sensitive.game(g),
          gameMedia: g.gameMedia,
          user: g.user,
        })),
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching games.",
        500,
        {
          message: (err as Error).message,
          filters: { uploadedBy, searchQuery },
          trace: (err as Error).stack,
        },
      );
    }
  })
  .get("/:nanoid", async (c) => {
    try {
      const game = await gamesService.getGame(
        {
          nanoid: c.req.param("nanoid"),
        },
        c.var.session.userId,
      );
      assertExistsAndOwns(game, c.var.session.userId, "game", "view", {
        allowPublic: true,
      });
      return c.json({
        ...sensitive.game(game),
        gameMedia: game.gameMedia,
        user: game.user,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching the game.",
        500,
        { nanoid: c.req.param("nanoid") },
      );
    }
  })
  .post(
    "/",
    requireAuth,
    zValidator("json", shapes.api.request.game),
    async (c) => {
      const data = c.req.valid("json");
      const nanoid = mkNanoid();
      try {
        const userId = getAuthUser(c).userId;

        const newGame = await tempOps.withCommit(async (commit, commitAll) => {
          const coverSaved = await commit(
            data.cover,
            { feature: "games", resourceNanoid: nanoid, fileCategory: "cover" },
            userId,
          );
          const heroSaved = data.hero
            ? await commit(
                data.hero,
                {
                  feature: "games",
                  resourceNanoid: nanoid,
                  fileCategory: "hero",
                },
                userId,
              )
            : undefined;

          const savedMedia = await commitAll(
            data.media ?? [],
            { feature: "games", resourceNanoid: nanoid, fileCategory: "media" },
            userId,
          );

          // Insert the data into the Database.
          const inOpNewGame = await gamesService.postGame(
            {
              ...data,
              nanoid,
              coverImgUrl: coverSaved.url,
              heroImgUrl: heroSaved?.url,
              description: data.description ?? "",
              uploaderId: userId,
            },
            savedMedia.length > 0 ? savedMedia : undefined,
          );
          if (!inOpNewGame) throw new Error("Game service returned no result");
          return inOpNewGame;
        });

        return c.json(
          {
            ...sensitive.game(newGame),
            gameMedia: newGame.gameMedia ?? [],
            user: newGame.user,
          },
          201,
        );
      } catch (err) {
        await tempOps
          .rmResourceDir({ feature: "games", nanoid })
          .catch(() => {});
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An unknown error has occurred while creating the game.",
          500,
          { message: (err as Error).message, trace: (err as Error).stack },
        );
      }
    },
  )
  .delete("/:nanoid", requireAuth, async (c) => {
    try {
      const userId = getAuthUser(c).userId;
      const gameToDelete = await gamesService.getGame(
        {
          nanoid: c.req.param("nanoid"),
        },
        userId,
      );
      assertExistsAndOwns(gameToDelete, userId, "game", "delete");

      const deletedGame = await gamesService.deleteGame(c.req.param("nanoid"));
      if (!deletedGame)
        throw new AppError("The specified game was not found.", 404);

      return c.json({ message: "The specified game has been deleted." });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while deleting the game.",
        500,
        { message: (err as Error).message, trace: (err as Error).stack },
      );
    }
  })
  .patch(
    "/:nanoid",
    requireAuth,
    zValidator("json", shapes.api.request.game.partial()),
    async (c) => {
      const data = c.req.valid("json");
      const nanoidParam = c.req.param("nanoid");
      try {
        const userId = getAuthUser(c).userId;
        const gameToUpdate = await gamesService.getGame(
          {
            nanoid: nanoidParam,
          },
          userId,
        );
        assertExistsAndOwns(gameToUpdate, userId, "game", "edit");

        const newSlug = data.title ? slug(data.title) : undefined;

        const updatedGame = await tempOps.withCommit(
          async (commit, commitAll) => {
            let coverImgUrl: string | undefined;
            if (data.cover) {
              const saved = await commit(
                data.cover,
                {
                  feature: "games",
                  resourceNanoid: gameToUpdate.nanoid,
                  fileCategory: "cover",
                },
                userId,
              );
              coverImgUrl = saved.url;
            }

            let heroImgUrl: string | null | undefined;
            let removedUrls: string[] = [];
            if (data.hero === null) {
              if (gameToUpdate.heroImgUrl) {
                removedUrls.push(gameToUpdate.heroImgUrl);
              }
              heroImgUrl = null;
            } else if (data.hero) {
              const saved = await commit(
                data.hero,
                {
                  feature: "games",
                  resourceNanoid: gameToUpdate.nanoid,
                  fileCategory: "hero",
                },
                userId,
              );
              if (gameToUpdate.heroImgUrl) {
                removedUrls.push(gameToUpdate.heroImgUrl);
              }
              heroImgUrl = saved.url;
            }

            let gameMediaData: MediaItem[] | undefined;
            if (data.media !== undefined) {
              const stagedKeys = data.media.filter((s) =>
                s.startsWith("temp_"),
              );
              const keepUrls = new Set(
                data.media.filter((s) => !s.startsWith("temp_")),
              );

              removedUrls.push(
                ...gameToUpdate.gameMedia
                  .filter((m) => !keepUrls.has(m.url))
                  .map((m) => m.url),
              );

              const savedNewMedia = await commitAll(
                stagedKeys,
                {
                  feature: "games",
                  resourceNanoid: gameToUpdate.nanoid,
                  fileCategory: "media",
                },
                userId,
              );

              gameMediaData = [
                ...gameToUpdate.gameMedia
                  .filter((m) => keepUrls.has(m.url))
                  .map((m) => ({ url: m.url, mimeType: m.mimeType })),
                ...savedNewMedia,
              ];
            }

            const result = await gamesService.patchGame(
              nanoidParam,
              { ...data, slug: newSlug, coverImgUrl, heroImgUrl },
              gameMediaData,
            );
            if (!result) throw new Error("Game service returned no result");

            await fileOps.cleanupFiles(removedUrls).catch(() => {});
            return result;
          },
        );

        return c.json({
          ...sensitive.game(updatedGame),
          gameMedia: updatedGame.gameMedia ?? [],
          user: updatedGame.user,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An unknown error has occurred while updating the game.",
          500,
          { message: (err as Error).message, trace: (err as Error).stack },
        );
      }
    },
  );

export type GamesType = typeof gamesRouter;
