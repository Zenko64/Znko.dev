import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "#middleware/requireAuth";
import postsService from "#services/posts";
import sensitive from "#security/sensitive";
import logger from "#core/logging";
import { shapes } from "@znko/types";
import { assertExistsAndOwns, getAuthUser } from "#security/ownership";
import { AppError } from "#core/errors";
import tempOps from "#core/storage";
import fileOps from "#functions/files";
import type { AppEnv } from "#types/hono";
import { nanoid as mkNanoid } from "nanoid";
import z from "zod";

type MediaItem = z.infer<typeof shapes.api.response.mediaItem>;

export const postsRouter = new Hono<AppEnv>()
  .get("/", zValidator("query", shapes.api.request.postsQuery), async (c) => {
    const query = c.req.query("search")?.toLocaleLowerCase() ?? undefined;
    const uploadedBy = c.req.query("uploadedBy") ?? undefined;
    try {
      const result = await postsService.getPosts(
        { query, uploadedBy },
        c.var.session.userId,
      );
      return c.json(
        result.map((p) => ({
          ...sensitive.post(p),
          postMedia: p.postMedia,
          user: p.user,
        })),
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching posts.",
        500,
        {
          message: (err as Error).message,
          queries: { query, uploadedBy },
          trace: (err as Error).stack,
        },
      );
    }
  })
  .get("/:nanoid", async (c) => {
    // OK
    try {
      const post = await postsService.getPost(
        { nanoid: c.req.param("nanoid") },
        c.var.session.userId,
      );
      assertExistsAndOwns(post, c.var.session.userId, "post", "view", {
        allowPublic: true,
      });
      return c.json({
        ...sensitive.post(post),
        postMedia: post.postMedia,
        user: post.user,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while fetching posts.",
        500,
        { message: (err as Error).message, trace: (err as Error).stack },
      );
    }
  })
  .post(
    "/",
    requireAuth,
    zValidator("json", shapes.api.request.post), // AI
    async (c) => {
      const data = c.req.valid("json"); // AI
      const nanoid = mkNanoid();
      const userId = getAuthUser(c).userId;
      try {
        const post = await tempOps.withCommit(async (_, commitAll) => {
          const savedFiles = await commitAll(
            data.media ?? [],
            { feature: "posts", resourceNanoid: nanoid, fileCategory: "media" },
            userId,
          );

          const result = await postsService.upload(
            { ...data, nanoid, uploaderId: userId },
            savedFiles.length > 0 ? savedFiles : undefined,
          );
          if (!result) throw new Error("Post service returned no results.");
          return result;
        });

        return c.json(
          {
            ...sensitive.post(post),
            postMedia: post.postMedia ?? [],
            user: post.user,
          },
          201,
        );
      } catch (err) {
        await tempOps.rmResourceDir({
          feature: "posts",
          nanoid,
        });

        if (err instanceof AppError) throw err;
        logger.error("Failed to create post:", err);
        throw new AppError(
          "An unknown error has occurred while creating the post.",
          500,
        );
      }
    },
  )
  .delete("/:nanoid", requireAuth, async (c) => {
    // OK
    try {
      const userId = getAuthUser(c).userId;
      const post = await postsService.getPost(
        { nanoid: c.req.param("nanoid") },
        userId,
      );
      assertExistsAndOwns(post, userId, "post", "delete");

      const deletedPost = await postsService.deletePost(post.nanoid);
      if (!deletedPost) throw new Error();

      return c.json({ message: "The specified post has been deleted." });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An unknown error has occurred while deleting the post.",
        500,
        { message: (err as Error).message, trace: (err as Error).stack },
      );
    }
  })
  .patch(
    "/:nanoid",
    requireAuth,
    zValidator("json", shapes.api.request.post.partial()),
    async (c) => {
      const userId = getAuthUser(c).userId;
      const data = c.req.valid("json");
      const nanoid = c.req.param("nanoid");
      try {
        const post = await postsService.getPost({ nanoid }, userId);
        assertExistsAndOwns(post, userId, "post", "edit");

        const result = await tempOps.withCommit(async (_, commitAll) => {
          let removedUrls: string[] = [];

          let postMediaData: MediaItem[] | undefined;
          if (data.media !== undefined) {
            const stagedKeys = data.media.filter((s) => s.startsWith("temp_"));
            const keepUrls = new Set(
              data.media.filter((s) => !s.startsWith("temp_")),
            );

            removedUrls = post.postMedia
              .filter((m) => !keepUrls.has(m.url))
              .map((m) => m.url);

            const savedNewMedia = await commitAll(
              stagedKeys,
              {
                feature: "posts",
                resourceNanoid: nanoid,
                fileCategory: "media",
              },
              userId,
            );

            postMediaData = [
              ...post.postMedia
                .filter((m) => keepUrls.has(m.url))
                .map((m) => ({ url: m.url, mimeType: m.mimeType })),
              ...savedNewMedia,
            ];
          }

          const patchedPost = await postsService.patchPost(
            nanoid,
            data,
            postMediaData,
          );
          if (!patchedPost)
            throw new Error(
              "An unknown error has occurred while updating the post.",
            );

          await fileOps.cleanupFiles(removedUrls).catch(() => {});
          return patchedPost;
        });
        return c.json({
          ...sensitive.post(result),
          postMedia: result.postMedia ?? [],
          user: result.user,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An unknown error has occurred while updating the post.",
          500,
        );
      }
    },
  );

export type PostsType = typeof postsRouter;
