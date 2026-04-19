/**
 * @file users.ts
 * @name Users Route
 * @description This defines the route handler for returning public user data.
 * @module routes/users
 * @author Zenko
 * @version 1.0.0
 * OK
 * */
import { Hono } from "hono";
import userService from "#services/users";
import sensitive from "#security/sensitive";
import { AppError } from "#core/errors";
import type { AppEnv } from "#types/hono";

export const usersRouter = new Hono<AppEnv>().get("/:username", async (c) => {
  try {
    const user = await userService.getUser({ username: c.req.param("username") });
    if (!user) throw new AppError("The specified user was not found.", 404);
    return c.json(sensitive.profile(user));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "An error occurred while fetching the user.",
      500,
      err instanceof Error ? { cause: err } : undefined,
    );
  }
});

export type UsersType = typeof usersRouter;
