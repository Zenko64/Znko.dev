/**
 * @file posts.ts
 * @name postsQueries
 * @module queries/posts
 * @description TanStack Query hooks for the posts feature. Handles fetching, creating, updating, and deleting posts, with cache management.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertOk, client } from "@/lib/client";
import type { InferRequestType, InferResponseType } from "hono/client";

export const postsQueryKey = ["posts"] as const;

/** A single post as returned by the API (sensitive fields stripped by the backend). */
export type Post = InferResponseType<typeof client.api.posts.$get>[number];
type PostQueryInput = InferRequestType<typeof client.api.posts.$get>["query"];
/** Wire-format input for creating a post. */
type PostInput = InferRequestType<typeof client.api.posts.$post>["json"];
/** Wire-format input for patching a post. All fields optional. */
type PostPatchInput = InferRequestType<
  (typeof client.api.posts)[":nanoid"]["$patch"]
>["json"];

/**
 * @name usePostsQuery
 * @description Fetches all posts from the API. Results are cached under `postsQueryKey`.
 * @returns TanStack Query result with the posts list.
 */
export function usePostsQuery(params: PostQueryInput = {}) {
  return useQuery({
    queryKey: [...postsQueryKey, params],
    queryFn: async (): Promise<Post[]> => {
      const res = await client.api.posts.$get({
        query: params,
      });
      await assertOk(res);
      return res.json();
    },
  });
}

/**
 * @name useCreatePostMutation
 * @description Creates a new post and prepends it to the cached list on success.
 * @returns TanStack mutation with `mutationFn` accepting a `PostInput`.
 */
export function useCreatePostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PostInput): Promise<Post> => {
      const res = await client.api.posts.$post({ json: body });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (newPost) => {
      qc.setQueriesData<Post[]>({ queryKey: postsQueryKey }, (prev) =>
        prev ? [newPost, ...prev] : [newPost],
      );
    },
  });
}

/**
 * @name useUpdatePostMutation
 * @description Updates a post by nanoid and replaces it in the cached list on success.
 * @returns TanStack mutation with `mutationFn` accepting `{ nanoid, body }`.
 */
export function useUpdatePostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nanoid,
      body,
    }: {
      nanoid: string;
      body: PostPatchInput;
    }): Promise<Post> => {
      const res = await client.api.posts[":nanoid"].$patch({
        param: { nanoid },
        json: body,
      });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (updatedPost) => {
      qc.setQueriesData<Post[]>(
        { queryKey: postsQueryKey },
        (prev) =>
          prev?.map((p) =>
            p.nanoid === updatedPost.nanoid ? updatedPost : p,
          ) ?? [],
      );
    },
  });
}

/**
 * @name useDeletePostMutation
 * @description Deletes a post by nanoid, removes it from the cached list, and returns the confirmation message.
 * @async
 * @returns TanStack mutation with `mutationFn` accepting a nanoid string.
 */
export function useDeletePostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nanoid: string): Promise<string> => {
      const res = await client.api.posts[":nanoid"].$delete({
        param: { nanoid },
      });
      await assertOk(res);
      return (await res.json()).message;
    },
    onSuccess: (_data, delNanoid) => {
      qc.setQueriesData<Post[]>(
        { queryKey: postsQueryKey },
        (prev) => prev?.filter((p) => p.nanoid !== delNanoid) ?? [],
      );
    },
  });
}
