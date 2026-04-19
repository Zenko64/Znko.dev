/**
 * @file core/oidc.ts
 * @module core/oidc
 * @description OIDC protocol setup and user resolution logic.
 * Manages the OIDC client configuration and resolves local user IDs from provider claims.
 * Must call {@link initOidc} once at startup before any handler is used.
 * OK
 */
import { discovery, ClientSecretPost } from "openid-client";
import type { Configuration, IDToken } from "openid-client";
import { env } from "#core/env";
import oidcDb from "#services/auth";
import { AppError } from "./errors";
import logger from "./logging";
import { db } from "#db/index";
import { nanoid as mkNanoid } from "nanoid";

// Initialize the OIDC Configuration
let config: Configuration = await discovery(
  new URL(env.OIDC_ISSUER),
  env.OIDC_CLIENT_ID,
  undefined,
  ClientSecretPost(env.OIDC_CLIENT_SECRET),
);

/**
 * @name processOidcClaims
 * @description This function takes the claims from an OIDC ID Token, verifies if it contains the required data,
 * and then either links the OIDC account to an existing user or creates a new user if necessary.
 * It also ensures that the Email Is Verified before linking, or creating an account, to prevent takeover attacks.
 * @param claims
 * @async
 * @returns UserID
 * @throws {AppError} If the required claims are missing, email is not verified, or there are any other errrors.
 */
async function processOidcClaims(claims: IDToken): Promise<number> {
  const email = claims["email"] as string | undefined;
  const emailVerified = claims["email_verified"] as boolean | undefined;
  if (!email || !emailVerified) {
    logger.error(
      "The OIDC Provider did not return the required claims.\nPlease verify the OIDC Provider's configuration.",
      { claims },
    );
    throw new AppError(
      "The OIDC Provider is not returning the required data. Please verify the OIDC Provider's configuration.",
      400,
    );
  }
  const username =
    (claims["preferred_username"] as string | undefined) ??
    `user_${mkNanoid(8)}`; // Fallback to a random username if not provided.
  const displayName = (claims["name"] as string | undefined) ?? username;
  const avatarUrl = claims["picture"] as string | undefined;

  // Profile object to better organize data
  const profile = { username, displayName, avatarUrl };

  try {
    const user = await db.transaction(async (tx) => {
      // Lookup inside transaction to narrow the race window for concurrent first logins.
      const linkedOidcAccount = await oidcDb.lookupOidcAccount(
        env.OIDC_ISSUER,
        claims.sub,
        tx,
      );
      if (linkedOidcAccount) return { id: linkedOidcAccount.userId };

      const userByEmail = await oidcDb.getUserByEmail(email, tx);

      // Use existing email matched user, or create a new one.
      const user =
        userByEmail ??
        (await oidcDb.createUser(
          { nanoid: mkNanoid(), email, ...profile },
          tx,
        ));

      // Link only, do not overwrite an existing user's profile with OIDC claims.
      await oidcDb.linkOidcAccount(user.id, claims.sub, env.OIDC_ISSUER, tx);
      return user;
    });

    return user.id;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("Failed to process the OIDC Login.", {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw new AppError(
      "An error occurred while processing the OIDC login.",
      500,
    );
  }
}

export default {
  get config() {
    return config;
  },
  processOidcClaims,
};
