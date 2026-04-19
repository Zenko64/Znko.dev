/**
 * @file videos.ts
 * @name Videos Router
 * @module routes/videos
 * @description Router handling all video related endpoints, including fetching, creating, updating, and deleting videos.
 * Implements strict validation and ownership checks to ensure security and data integrity.
 * @version 1.0.0
 * @author Zenko
 * OK Code Fully Verified
 * */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "#middleware/requireAuth";
import videosService from "#services/videos";
import gamesService from "#services/games";
import sensitive from "#security/sensitive";
import { shapes } from "@znko/types";
import { assertExistsAndOwns, getAuthUser } from "#security/ownership";
import { AppError } from "#core/errors";
import tempOps from "#core/storage";
import pathOps from "#functions/paths";
import { dirStruct } from "#/constants";
import queues from "#/queue/queues";
import type { AppEnv } from "#types/hono";
import { nanoid } from "nanoid";
import { join } from "path";
import { RedisClient } from "bun";
import z from "zod";

type VideoProcessingStatus = z.infer<typeof shapes.jobs.videoTranscodeStatus>;

export const videosRouter = new Hono<AppEnv>()
  .get("/", zValidator("query", shapes.api.request.videosQuery), async (c) => {
    // OK
    const uploadedBy = c.req.query("uploadedBy") ?? undefined;
    const gameSlug = c.req.query("game")?.toLowerCase() ?? undefined;
    const searchQuery = c.req.query("search")?.toLocaleLowerCase() ?? undefined;
    try {
      const videos = await videosService.getVideos(
        {
          uploadedBy,
          gameSlug,
          query: searchQuery,
        },
        c.var.session.userId,
      );
      return c.json(
        videos.map((video) => ({
          ...sensitive.video(video),
          game: video.game ? sensitive.game(video.game) : null,
          user: video.user,
        })),
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching videos.",
        500,
        {
          message: (err as Error).message,
          filters: { uploadedBy, gameSlug, searchQuery },
          trace: (err as Error).stack,
        },
      );
    }
  })
  .get("/:nanoid", async (c) => {
    // OK
    try {
      const video = await videosService.getVideo(
        { nanoid: c.req.param("nanoid") },
        c.var.session.userId,
      );
      assertExistsAndOwns(video, c.var.session.userId, "video", "view", {
        allowPublic: true,
      });
      return c.json({
        ...sensitive.video(video),
        game: video.game ? sensitive.game(video.game) : null,
        user: video.user,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching the video.",
        500,
        {
          message: (err as Error).message,
          trace: (err as Error).stack,
        },
      );
    }
  })
  .post(
    "/",
    requireAuth,
    zValidator("json", shapes.api.request.video), // AI
    async (c) => {
      const userId = getAuthUser(c).userId;
      const data = c.req.valid("json"); // AI
      const resourceNanoid = nanoid();
      try {
        const game = data.gameNanoid
          ? await gamesService.getGame({ nanoid: data.gameNanoid }, userId)
          : null;

        if (data.gameNanoid) {
          assertExistsAndOwns(game, userId, "game", "view", {
            allowPublic: true,
          });
        }

        // TODO: Human — issues.md #1 "image/" prefix admits SVG for thumbnail; tighten MIME allowlist.
        const video = await tempOps.withCommit(async (commit) => {
          const videoSaved = await commit(
            data.video,
            { feature: "videos", resourceNanoid, fileCategory: "video" },
            userId,
          );
          const thumbSaved = await commit(
            data.thumbnail,
            { feature: "videos", resourceNanoid, fileCategory: "thumbnail" },
            userId,
          );

          //TODO: Move to scheduler file
          const inputPath = pathOps.fsPathFromUrl(videoSaved.url);
          if (!inputPath)
            throw new AppError(
              "Could not resolve video path for transcoding.",
              500,
            );
          await queues.videoProcessing.add(
            "VideoProcessing",
            {
              videoNanoid: resourceNanoid,
              input: inputPath,
              output: join(dirStruct.uploads, "videos", resourceNanoid),
            },
            { jobId: resourceNanoid },
          );

          return await videosService.createVideo({
            ...data,
            nanoid: resourceNanoid,
            uploaderId: userId,
            thumbnailUrl: thumbSaved.url,
            status: "pending",
            gameId: game ? game.id : null,
          });
        });

        return c.json(
          {
            ...sensitive.video(video),
            game: video.game ? sensitive.game(video.game) : null,
            user: video.user,
          },
          201,
        );
      } catch (err) {
        queues.videoProcessing.remove(resourceNanoid);
        await tempOps.rmResourceDir({
          feature: "videos",
          nanoid: resourceNanoid,
        });
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An unknown error has occurred while creating the video.",
          500,
          {
            message: (err as Error).message,
            trace: (err as Error).stack,
          },
        );
      }
    },
  )
  .delete("/:nanoid", requireAuth, async (c) => {
    // OK
    try {
      const userId = getAuthUser(c).userId;
      const video = await videosService.getVideo(
        { nanoid: c.req.param("nanoid") },
        userId,
      );
      assertExistsAndOwns(video, userId, "video", "delete");
      const deleted = await videosService.deleteVideo(video.id);
      if (!deleted) {
        throw new AppError("The specified video was not found.", 404);
      }
      return c.json({ message: "The specified video has been deleted." });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while deleting the video.",
        500,
        {
          message: (err as Error).message,
          trace: (err as Error).stack,
        },
      );
    }
  })
  .patch(
    // OK
    "/:nanoid",
    requireAuth,
    zValidator("json", shapes.api.request.video.partial()),
    async (c) => {
      const data = c.req.valid("json");
      const userId = getAuthUser(c).userId;

      try {
        const videoToUpdate = await videosService.getVideo(
          { nanoid: c.req.param("nanoid") },
          userId,
        );
        assertExistsAndOwns(videoToUpdate, userId, "video", "update");

        const newGameId =
          data.gameNanoid === null
            ? null
            : data.gameNanoid
              ? (
                  await gamesService.getGame(
                    { nanoid: data.gameNanoid },
                    userId,
                  )
                )?.id
              : undefined;

        const updatedVideo = await videosService.updateVideo(
          videoToUpdate.nanoid,
          {
            ...data,
            gameId: newGameId,
          },
        );
        if (!updatedVideo)
          throw new AppError("The specified video was not found.", 404);

        return c.json({
          ...sensitive.video(updatedVideo),
          game: updatedVideo.game ? sensitive.game(updatedVideo.game) : null,
          user: updatedVideo.user,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An unknown error has occurred while updating the video.",
          500,
          {
            message: (err as Error).message,
            trace: (err as Error).stack,
          },
        );
      }
    },
  );

export type VideosType = typeof videosRouter;

// ? For Encoding Proccess Progress bar
export const videosProgressRouter = new Hono<AppEnv>().get(
  "/:nanoid/progress",
  async (c) => {
    const videoNanoid = c.req.param("nanoid");
    const userId = getAuthUser(c).userId;

    const video = await videosService.getVideo({ nanoid: videoNanoid }, userId);
    assertExistsAndOwns(video, userId, "video", "view", { allowPublic: true });

    // Return ready status
    if (video.status === "ready") {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({ status: "ready" } as VideoProcessingStatus),
        });
      });
    }

    // Return error status
    if (video.status === "failed") {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({ status: "failed" } as VideoProcessingStatus),
        });
      });
    }

    const channel = `video:${videoNanoid}:progress`;
    const sub = new RedisClient();
    await sub.connect();

    return streamSSE(c, async (stream) => {
      await new Promise<void>((r) => {
        stream.onAbort(() => {
          sub.unsubscribe(channel).catch(() => {});
          r();
        });

        sub.subscribe(channel, async (message: string) => {
          await stream.writeSSE({ data: message }).catch(() => {});
          shapes.jobs.videoTranscodeStatus
            .parseAsync(JSON.parse(message))
            .then(async ({ status }) => {
              if (status === "ready" || status === "failed") {
                await sub.unsubscribe(channel).catch(() => {});
                r();
              }
            });
        });
      });
    });
  },
);
