/**
 * @description
 * This module provides functions for handling user authentication and profile management,
 * for OIDC accounts. It includes functions to look up OIDC accounts,
 * update user profiles, find users by email, create new users, and link OIDC accounts to users.
 * @module @api/handlers/auth
 * @file handlers/auth.ts
 * @author Zenko
 * OK
 */
import { and, eq } from "drizzle-orm";
import { db } from "#db/index";
import type { DbOrTx } from "#db/index";
import { userOidcAccounts, users } from "#db/schema";
import fileOps from "#functions/files";
import { env } from "#core/env";
import { ROUTES } from "@znko/consts";

//TODO: Analyse and JSDoc

// ? No need to validate the email format. It is provided by the OIDC Server and is safe.
// ? If manual login is implemenented in the future, email validation can be added.
interface Profile {
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

/**
 * @name lookupOidcAccount
 * @description Looks up an OIDC account by its issuer and subject.
 * @param issuer The OIDC provider's issuer URL.
 * @param subject The 'sub' claim from the OIDC ID Token, which identifies the user with the issuer.
 * @returns A promise resolving to the found OIDC account or null if not found.
 */
async function lookupOidcAccount(issuer: string, subject: string, tx: DbOrTx = db) {
  return await (tx as typeof db).query.userOidcAccounts.findFirst({
    where: (userOidcAcc) =>
      and(eq(userOidcAcc.issuer, issuer), eq(userOidcAcc.subject, subject)),
  });
}

async function updateUserProfile(
  userId: number,
  profile: Profile,
  tx: DbOrTx = db,
) {
  const existing = await getUserById(userId);
  if (!existing) {
    throw new Error("The specified user was not found.");
  }

  // If the OIDC provider sends a new avatar but the user already has a local one, keep the local one.
  const newAvatarUrl =
    !(profile.avatarUrl === undefined) && profile.avatarUrl === null
      ? null
      : profile.avatarUrl?.startsWith(env.OIDC_ISSUER) &&
          existing.avatarUrl &&
          !existing.avatarUrl.startsWith(env.OIDC_ISSUER)
        ? existing.avatarUrl
        : profile.avatarUrl;

  const [updatedUser] = await (tx ?? db)
    .update(users)
    .set({ ...profile, avatarUrl: newAvatarUrl, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    if (newAvatarUrl && newAvatarUrl.startsWith(ROUTES.uploads)) {
      await fileOps.unlinkFileByUrl(newAvatarUrl);
    }
    throw new Error(
      "An unknown error has occurred while updating the user profile.",
    );
  }

  // Delete the old local avatar only when it is being replaced.
  if (
    existing.avatarUrl?.startsWith(ROUTES.uploads) &&
    newAvatarUrl !== existing.avatarUrl
  ) {
    await fileOps.unlinkFileByUrl(existing.avatarUrl);
  }
  return updatedUser;
}

async function createUser(data: typeof users.$inferInsert, tx: DbOrTx = db) {
  const [user] = await (tx ?? db)
    .insert(users)
    .values({ ...data })
    .returning();
  if (!user) {
    throw new Error("An unknown error has occurred while creating the user.");
  }
  return user;
}

async function linkOidcAccount(
  userId: number,
  subject: string,
  issuer: string,
  tx: DbOrTx = db,
) {
  const [oidcAccount] = await (tx ?? db)
    .insert(userOidcAccounts)
    .values({
      userId,
      provider: new URL(issuer).hostname,
      subject,
      issuer,
    })
    .returning();
  if (!oidcAccount) {
    throw new Error(
      "An unknown error has occurred while linking the OIDC account to the user.",
    );
  }
  return oidcAccount;
}

async function getUserById(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new Error("The specified user was not found.");
  }
  return user;
}

async function getUserByEmail(email: string, tx: DbOrTx = db) {
  const [user] = await (tx ?? db).select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export default {
  lookupOidcAccount,
  updateUserProfile,
  getUserByEmail,
  createUser,
  linkOidcAccount,
  getUserById,
};
