/**
 * @file videos.ts
 * @name videosQueries
 * @module queries/videos
 * @description TanStack Query hooks for the videos feature. Handles fetching, uploading, updating, and deleting videos, with cache management.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
// AI
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertOk, client } from "@/lib/client";
import type { InferRequestType, InferResponseType } from "hono/client";
import { shapes } from "@znko/types";
import { ROUTES } from "@znko/consts";
import type { z } from "zod";

export const videosBaseKey = ["videos"] as const;

export const videoKey = (nanoid: string | undefined) =>
  ["video", nanoid] as const;

/** A single video as returned by the API (sensitive fields stripped by the backend). */
export type Video = InferResponseType<typeof client.api.videos.$get>[number];
/** Wire-format query params for filtering the videos list. */
type VideosQuery = InferRequestType<typeof client.api.videos.$get>["query"];
/** Wire-format input for uploading a video — temp filenames from staging. */
export type VideoInput = InferRequestType<
  typeof client.api.videos.$post
>["json"];
/** Wire-format input for patching a video. All fields optional. */
type VideoPatchInput = InferRequestType<
  (typeof client.api.videos)[":nanoid"]["$patch"]
>["json"];

/**
 * @name useVideosQuery
 * @description Fetches the videos list with optional filters. Query key includes params for per-filter caching.
 * @returns TanStack Query result with the videos list.
 */
export function useVideosQuery(params: VideosQuery = {}) {
  return useQuery({
    queryKey: [...videosBaseKey, params],
    queryFn: async (): Promise<Video[]> => {
      const res = await client.api.videos.$get({
        query: params,
      });
      await assertOk(res);
      return res.json();
    },
  });
}

/**
 * @name useVideoQuery
 * @description Fetches a single video by nanoid. Only runs when nanoid is defined.
 * @returns TanStack Query result with the video.
 */
export function useVideoQuery(nanoid: string | undefined) {
  return useQuery({
    queryKey: videoKey(nanoid),
    queryFn: async (): Promise<Video> => {
      const res = await client.api.videos[":nanoid"].$get({
        param: { nanoid: nanoid! },
      });
      await assertOk(res);
      return res.json();
    },
    enabled: !!nanoid,
  });
}

/**
 * @name useUploadVideoMutation
 * @description Uploads a new video and appends it to the cached list on success.
 * @returns TanStack mutation with `mutationFn` accepting a `VideoInput`.
 */
export function useUploadVideoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: VideoInput): Promise<Video> => {
      const res = await client.api.videos.$post({ json: data });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (newVideo) => {
      qc.setQueriesData<Video[]>({ queryKey: videosBaseKey }, (prev) =>
        prev ? [...prev, newVideo] : [newVideo],
      );
    },
  });
}

/**
 * @name useUpdateVideoMutation
 * @description Updates a video by nanoid and replaces it in both the list and individual caches on success.
 * @returns TanStack mutation with `mutationFn` accepting `{ nanoid, data }`.
 */
export function useUpdateVideoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nanoid,
      data,
    }: {
      nanoid: string;
      data: VideoPatchInput;
    }): Promise<Video> => {
      const res = await client.api.videos[":nanoid"].$patch({
        param: { nanoid },
        json: data,
      });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (updated) => {
      qc.setQueriesData<Video[]>(
        { queryKey: videosBaseKey },
        (prev) =>
          prev?.map((v) => (v.nanoid === updated.nanoid ? updated : v)) ?? [],
      );
      qc.setQueryData(videoKey(updated.nanoid), updated);
    },
  });
}

/**
 * @name useDeleteVideoMutation
 * @description Deletes a video by nanoid, removes it from the list cache, and clears its individual cache entry.
 * @async
 * @returns TanStack mutation with `mutationFn` accepting a nanoid string.
 */
export function useDeleteVideoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nanoid: string): Promise<string> => {
      const res = await client.api.videos[":nanoid"].$delete({
        param: { nanoid },
      });
      await assertOk(res);
      return (await res.json()).message;
    },
    onSuccess: (_data, deletedNanoid) => {
      qc.setQueriesData<Video[]>(
        { queryKey: videosBaseKey },
        (prev) => prev?.filter((v) => v.nanoid !== deletedNanoid) ?? [],
      );
      qc.removeQueries({ queryKey: videoKey(deletedNanoid) });
    },
  });
}

export type VideoTranscodeProgress = z.infer<
  typeof shapes.jobs.videoTranscodeStatus
>;

/**
 * Opens an SSE connection to stream transcode progress for a video.
 * Closes automatically on terminal status (ready/failed).
 * Invalidates both the individual video and list caches when ready.
 */
export function useVideoTranscodeProgress(
  nanoid: string | undefined,
  enabled = true,
) {
  const qc = useQueryClient();
  const [data, setData] = useState<VideoTranscodeProgress | null>(null);

  useEffect(() => {
    if (!nanoid || !enabled) return;

    const source = new EventSource(`${ROUTES.videos}/${nanoid}/progress`, {
      withCredentials: true,
    });

    source.onmessage = (e: MessageEvent<string>) => {
      const parsed = shapes.jobs.videoTranscodeStatus.safeParse(
        JSON.parse(e.data),
      );
      if (!parsed.success) return;
      setData(parsed.data);
      if (parsed.data.status === "ready" || parsed.data.status === "failed") {
        source.close();
        if (parsed.data.status === "ready") {
          qc.invalidateQueries({ queryKey: videoKey(nanoid) });
        }
      }
    };

    source.onerror = () => source.close();

    return () => source.close();
  }, [nanoid, enabled, qc]);

  return data;
}
