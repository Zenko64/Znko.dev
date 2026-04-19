/**
 * @name postsService
 * @module services/posts
 * @description CRUD Service layer for the posts feature. Handles db and filesystem interactions.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import { db } from "#db/index";
import { postMedia, posts } from "#db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import z from "zod";
import { shapes } from "@znko/types";

type MediaItem = z.infer<typeof shapes.api.response.mediaItem>;
import tempOps from "#core/storage";
import dbOps from "#functions/db";
import { AppError } from "#core/errors";

/**
 * @name upload
 * @description Creates a new post with optional media attachments in a single transaction.
 * @param postData Post data to insert.
 * @param postMediaData Optional media items to attach to the post.
 * @returns The created post with media and user relations.
 */
async function upload(
  postData: Omit<typeof posts.$inferInsert, "createdAt" | "updatedAt">,
  postMediaData?: MediaItem[],
) {
  return await db.transaction(async (tx) => {
    const [post] = await tx.insert(posts).values(postData).returning();

    if (postMediaData && postMediaData.length > 0) {
      await tx.insert(postMedia).values(
        postMediaData.map((media) => ({
          postId: post.id,
          ...media,
        })),
      );
    }
    return await tx.query.posts.findFirst({
      where: eq(posts.id, post.id),
      with: {
        postMedia: {
          columns: {
            id: false,
            postId: false,
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
  });
}

/**
 * @name getPosts
 * @description Fetches posts visible to the user, with optional filtering by uploader and search query.
 * @param filter Optional filters: uploadedBy (username) and query (search string).
 * @param userId The requesting user's ID. Includes their private posts if provided.
 * @returns Array of posts with media and user relations.
 */
async function getPosts(
  filter: {
    uploadedBy?: string;
    query?: string;
  },
  userId?: number,
) {
  const { uploadedBy, query } = filter;
  const resolvedUsernameId = uploadedBy
    ? await db.query.users
        .findFirst({ where: (u) => eq(u.username, uploadedBy) })
        .then((r) => r?.id)
    : undefined;

  if (uploadedBy && !resolvedUsernameId) {
    return [];
  }

  return await db.query.posts.findMany({
    where: (p) => {
      const conditions = [
        userId
          ? or(eq(posts.public, true), eq(posts.uploaderId, userId))
          : eq(posts.public, true),
      ];
      if (resolvedUsernameId)
        conditions.push(eq(posts.uploaderId, resolvedUsernameId));
      if (query) conditions.push(ilike(p.content, `%${query}%`));
      return and(...conditions);
    },
    orderBy: (posts, { desc }) => [desc(posts.pinned), desc(posts.createdAt)],
    with: {
      postMedia: {
        columns: {
          id: false,
          postId: false,
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
}

/**
 * @name getPost
 * @description Fetches a single post by nanoid with media and user relations.
 * @param nanoid The post's public nanoid identifier.
 * @returns The post or undefined if not found.
 */
async function getPost(
  { id, nanoid }: { id?: number; nanoid?: string },
  userId?: number,
) {
  return await db.query.posts.findFirst({
    where: (post) =>
      and(
        id ? eq(post.id, id) : undefined,
        nanoid ? eq(post.nanoid, nanoid) : undefined,
        userId
          ? or(eq(post.uploaderId, userId), eq(post.public, true))
          : eq(post.public, true),
      ),
    with: {
      postMedia: {
        columns: {
          id: false,
          postId: false,
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
}

/**
 * @name patchPost
 * @description Updates a post's fields and optionally syncs its media in a single transaction.
 * @param nanoid The post's public nanoid identifier.
 * @param postData Partial post fields to update.
 * @param postMediaData If provided, syncs media to match this array (adds new, removes missing).
 * @returns The updated post with relations, or undefined if not found.
 */
async function patchPost(
  nanoid: string,
  postData: Partial<typeof posts.$inferInsert>,
  postMediaData?: MediaItem[],
) {
  return await db.transaction(async (tx) => {
    const [updatedPost] = await tx
      .update(posts)
      .set({
        content: postData.content,
        rating: postData.rating,
        public: postData.public,
        pinned: postData.pinned,
      })
      .where(eq(posts.nanoid, nanoid))
      .returning();

    if (!updatedPost) return undefined;

    if (postMediaData !== undefined) {
      await dbOps.syncItemMedia(tx, postMedia, postMediaData, updatedPost.id);
    }

    return await tx.query.posts.findFirst({
      where: eq(posts.nanoid, nanoid),
      with: {
        postMedia: {
          columns: {
            id: false,
            postId: false,
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
  });
}

/**
 * @name deletePost
 * @description Deletes a post and its associated files from disk.
 * @param nanoid The post's public nanoid identifier.
 * @returns true if deleted, false if not found.
 * @throws {Error} If the deletion fails unexpectedly.
 */
async function deletePost(nanoid: string) {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.nanoid, nanoid),
      with: { postMedia: { columns: { url: true } } },
    });
    if (!post) return false;
    await db.delete(posts).where(eq(posts.nanoid, nanoid));
    await tempOps.rmResourceDir({
      feature: "posts",
      nanoid,
    });
    return true;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new Error(
      "Failed to delete post.",
      err instanceof Error ? { cause: err } : undefined,
    );
  }
}

export default {
  upload,
  getPosts,
  getPost,
  patchPost,
  deletePost,
};
