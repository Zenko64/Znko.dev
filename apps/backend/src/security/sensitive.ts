/**
 * @name sensitive.ts
 * @description Utility functions that strip internal/sensitive fields before returning data.
 * Stripped fields are optional in the parameter type because services may already exclude them
 * via Drizzle column projections. The return type contains only safe, public fields.
 * @module @znko/api/security
 */

import {
  users as usersTable,
  posts as postsTable,
  games as gamesTable,
  videos as videosTable,
} from "#db/schema";

/*
Now Learned: Typescript Generics
The following generic takes a type T (object type)
and a set of Keys that belong to the object type T.
First, we remove the specified keys from the T, leaving only the required fields.
Then we pick only the specified keys from T and make them optional.
Then we merge the two types, making the specified keys optional while maintaining the original ones. 
*/
type Strip<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type UserRow = Strip<
  typeof usersTable.$inferSelect,
  "id" | "updatedAt" | "createdAt"
>;
type PostRow = Strip<
  typeof postsTable.$inferSelect,
  "id" | "uploaderId" | "updatedAt"
>;
type GameRow = Strip<
  typeof gamesTable.$inferSelect,
  "id" | "uploaderId" | "updatedAt" | "createdAt" | "order"
>;
type VideoRow = Strip<
  typeof videosTable.$inferSelect,
  "id" | "gameId" | "uploaderId"
>;

function user(u: UserRow) {
  const { id, updatedAt, createdAt, ...safe } = u;
  return safe;
}

function profile(p: UserRow) {
  // Profile is a subset of user, but it is for public display so we strip other personal data.
  const { id, email, updatedAt, createdAt, ...safe } = p as Strip<
    typeof usersTable.$inferSelect,
    "id" | "email" | "updatedAt" | "createdAt"
  >;
  return safe;
}

function post(p: PostRow) {
  //
  const { id, uploaderId, updatedAt, ...safe } = p;
  return safe;
}

function game(g: GameRow) {
  const { id, uploaderId, updatedAt, createdAt, order, ...safe } = g;
  return safe;
}

function video(v: VideoRow) {
  const { id, gameId, uploaderId, ...safe } = v;
  return safe;
}

export default {
  user,
  users: (list: UserRow[]) => list.map(user),
  post,
  posts: (list: PostRow[]) => list.map(post),
  game,
  games: (list: GameRow[]) => list.map(game),
  profile,
  profiles: (list: UserRow[]) => list.map(profile),
  video,
  videos: (list: VideoRow[]) => list.map(video),
};
