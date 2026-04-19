/**
 * @file games.ts
 * @name gamesQueries
 * @module queries/games
 * @description TanStack Query hooks for the games feature. Handles fetching, creating, updating, and deleting games, with cache management.
 * @version 1.0.0
 * @author Zenko
 * OK
 */
// AI
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertOk, client } from "@/lib/client";
import type { InferRequestType, InferResponseType } from "hono/client";

export const gamesQueryKey = ["games"] as const;

/** A single game as returned by the API (sensitive fields stripped by the backend). */
export type Game = InferResponseType<typeof client.api.games.$get>[number];
/** A single media item attached to a game. */
export type GameMedia = NonNullable<Game["gameMedia"]>[number];

type GameQueryInput = InferRequestType<typeof client.api.games.$get>["query"];
/** Wire-format input for creating a game. */
type GameInput = InferRequestType<typeof client.api.games.$post>["json"];
/** Wire-format input for patching a game. All fields optional. */
type GamePatchInput = InferRequestType<
  (typeof client.api.games)[":nanoid"]["$patch"]
>["json"];

/**
 * @name useGamesQuery
 * @description Fetches all games from the API. Results are cached under `gamesQueryKey`.
 * @returns TanStack Query result with the games list.
 */
export function useGamesQuery(params: GameQueryInput = {}) {
  return useQuery({
    queryKey: [...gamesQueryKey, params], // Dont retrigger queries
    queryFn: async (): Promise<Game[]> => {
      const res = await client.api.games.$get({ query: params });
      await assertOk(res);
      return res.json();
    },
  });
}

/**
 * @name useCreateGameMutation
 * @description Creates a new game and appends it to the cached list on success.
 * @returns TanStack mutation with `mutationFn` accepting a `GameInput`.
 */
export function useCreateGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GameInput): Promise<Game> => {
      const res = await client.api.games.$post({ json: data });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (newGame) => {
      qc.setQueriesData<Game[]>({ queryKey: gamesQueryKey }, (prev) =>
        prev ? [...prev, newGame] : [newGame],
      );
    },
  });
}

/**
 * @name useUpdateGameMutation
 * @description Updates a game by nanoid and replaces it in the cached list on success.
 * @returns TanStack mutation with `mutationFn` accepting `{ nanoid, data }`.
 */
export function useUpdateGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nanoid, data }: { nanoid: string; data: GamePatchInput }): Promise<Game> => {
      const res = await client.api.games[":nanoid"].$patch({ param: { nanoid }, json: data });
      await assertOk(res);
      return res.json();
    },
    onSuccess: (updatedGame) => {
      qc.setQueriesData<Game[]>(
        { queryKey: gamesQueryKey },
        (prev) =>
          prev?.map((g) =>
            g.nanoid === updatedGame.nanoid ? updatedGame : g,
          ) ?? [],
      );
    },
  });
}

/**
 * @name useDeleteGameMutation
 * @description Deletes a game by nanoid, removes it from the cached list, and returns the confirmation message.
 * @async
 * @returns TanStack mutation with `mutationFn` accepting a nanoid string.
 */
export function useDeleteGameMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nanoid: string): Promise<string> => {
      const res = await client.api.games[":nanoid"].$delete({
        param: { nanoid },
      });
      await assertOk(res);
      return (await res.json()).message;
    },
    onSuccess: (_data, nanoid) => {
      qc.setQueriesData<Game[]>(
        { queryKey: gamesQueryKey },
        (prev) => prev?.filter((g) => g.nanoid !== nanoid) ?? [],
      );
    },
  });
}
