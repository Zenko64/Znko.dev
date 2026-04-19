/**
 * @name usersService
 * @description Service for handling public user related operations.
 * This service provides a operations for public user data.
 * @author Zenko
 * @version 1.0.0
 * @module services/users
 */
import { db } from "#db/index";
import { and, eq } from "drizzle-orm";

/**
 * @name getUser
 * @description Retrieves a user by their username.
 * @param username
 * @returns The user object if found, otherwise null.
 * @throws {Error} If there is an issue with the query
 * @returns User
 * @async
 */
async function getUser({
  id,
  nanoid,
  username,
  email,
}: {
  id?: number;
  nanoid?: string;
  username?: string;
  email?: string;
}) {
  return await db.query.users.findFirst({
    where: (user) =>
      and(
        id ? eq(user.id, id) : undefined,
        nanoid ? eq(user.nanoid, nanoid) : undefined,
        username ? eq(user.username, username) : undefined,
        email ? eq(user.email, email) : undefined,
      ),
  });
}

export default {
  getUser,
};
