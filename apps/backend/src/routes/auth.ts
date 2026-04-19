import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  calculatePKCECodeChallenge,
  randomState,
  randomPKCECodeVerifier,
  buildAuthorizationUrl,
  authorizationCodeGrant,
} from "openid-client";
import { requireAuth } from "#middleware/requireAuth";
import oidc from "#core/oidc";
import { ROUTES } from "@znko/consts";
import { env } from "#core/env";
import type { AppEnv } from "#types/hono";
import authService from "#services/auth";
import { getAuthUser } from "#security/ownership";
import { AppError } from "#core/errors";
import sensitive from "#security/sensitive";
import sanitize from "#security/sanitation";
import tempOps from "#core/storage";
import { shapes } from "@znko/types";
import crypto from "crypto";

const { auth } = ROUTES;

const authRouter = new Hono<AppEnv>()
  .get(auth.login, async (c) => {
    // * Login flow
    const codeVerifier = randomPKCECodeVerifier(); // Generate a PKCE Code Verifier. (This is a raw random string, and is checked again in the callback from the server). It stays on the server and is
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier); // Hash and encode the PKCE Code Verifier (SHA-256) to create the challenge that is sent to the OIDC Provider on login by the client-side.
    const state = randomState();

    // This will be undefined if the redirect is either not present, or is deemed unsafe.
    const redirect = sanitize.redirect(c.req.query("redirect"));

    c.var.session.redirect = redirect;
    c.var.session.pkceCodeVerifier = codeVerifier;
    c.var.session.state = state;

    const url = buildAuthorizationUrl(
      oidc.config,
      new URLSearchParams({
        redirect_uri: `${env.APP_URL}${auth.base}${auth.callback}`,
        response_type: "code",
        scope: "openid profile email",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }),
    );
    return c.redirect(url.href);
  })
  .get(auth.callback, async (c) => {
    const session = c.get("session");
    const { pkceCodeVerifier, state } = session;

    // If the callback URL is hit by a request that is missing t
    if (!pkceCodeVerifier || !state) {
      return c.text(
        "Missing session state. Please attempt to log in again.",
        400,
      );
    }

    try {
      const raw = URL.parse(c.req.url);
      if (!raw) {
        throw new AppError(
          "The server has received an invalid callback URL.",
          400,
        );
      }
      const callbackUrl = new URL(`${raw.pathname}${raw.search}`, env.APP_URL);

      // ? The callbackUrl contains the state which ties the callback to the login attempt.
      const tokens = await authorizationCodeGrant(oidc.config, callbackUrl, {
        pkceCodeVerifier,
        expectedState: state,
      }); // ! Directly send the Unhashed PKCE Code Verifier. IT MUST ONLY BE STORED Server-side. The provider will hash it and check if it matches the original challenge sent by the client.

      const claims = tokens.claims(); // Get the claims returned from the server.
      if (!claims)
        throw new Error(
          "No claims were recieved from the OIDC Provider. Login failed. Please check the provider configuration, and try again.",
        );

      // Resolve the claims to the userId. (This uses the sub claim)
      const userId = await oidc.processOidcClaims(claims);
      const redirect = session.redirect;

      // Set the userId in the session, and clear the now unnecessary PKCE data and redirect.
      session.userId = userId;
      c.set("sessionId", crypto.randomBytes(32).toString("hex"));
      session.pkceCodeVerifier = undefined;
      session.state = undefined;
      session.redirect = undefined;

      return c.redirect(redirect ?? "/");
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An error occurred during the OIDC callback process. Please try logging in again.",
        500,
        { message: (err as Error).message, trace: (err as Error).stack },
      );
    } finally {
      // Clear these because they should only be used for each login attempt.
      session.pkceCodeVerifier = undefined;
      session.state = undefined;
      session.redirect = undefined;
    }
  })
  .get(auth.profile, requireAuth, async (c) => {
    try {
      const user = await authService.getUserById(getAuthUser(c).userId);
      return c.json(sensitive.user(user));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "An error occurred while fetching the user profile.",
        500,
        { message: (err as Error).message, trace: (err as Error).stack },
      );
    }
  })
  .get(auth.logout, requireAuth, (c) => {
    c.var.session._destroyed = true; // Destroy the session to log the user out.

    const redirect = sanitize.redirect(c.req.query("redirect")); // This will be undefined if the redirect is either not present, or is deemed unsafe.

    // Check if the OIDC Provider has an end session endpoint.
    // This also clears the session cookie from the provider, requiring the complete login flow to be repeated.
    const endSessionUrl = oidc.config.serverMetadata().end_session_endpoint;
    // If it does, redirect the user to the OIDC Provider and log them out there.
    if (endSessionUrl) {
      const url = new URL(endSessionUrl);
      url.searchParams.set(
        "post_logout_redirect_uri",
        `${env.APP_URL}${redirect ?? "/"}?logout=true`,
      ); // This sends the user back to the app or the redirect after logging out.
      return c.redirect(url.href);
    }
    return c.redirect(`${env.APP_URL}${redirect ?? "/"}?logout=true`); // If not, just redirect back to the app with the optional redirect.
  })
  .patch(
    auth.profile,
    requireAuth,
    zValidator("json", shapes.api.request.profile),
    async (c) => {
      const data = c.req.valid("json");
      const { userId } = getAuthUser(c);
      const user = await authService.getUserById(userId);

      try {
        const updatedUser = await tempOps.withCommit(async (commit) => {
          const avatarUrl: string | undefined | null = data.avatar
            ? (
                await commit(
                  data.avatar,
                  {
                    feature: "users",
                    fileCategory: "avatar",
                    resourceNanoid: user.nanoid,
                  },
                  userId,
                )
              ).url
            : data.avatar === null
              ? null
              : undefined; // If there is a file, save it and get the URL. If there is explicitly no file (null), set the avatar to null. Else, leave it unchanged (undefined).

          return await authService.updateUserProfile(user.id, {
            ...(data.username !== undefined && { username: data.username }),
            displayName: data.displayName,
            avatarUrl,
          });
        });
        return c.json({ success: true, data: sensitive.user(updatedUser) });
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          "An error occurred while updating the user profile.",
          500,
          { message: (err as Error).message, trace: (err as Error).stack },
        );
      }
    },
  );

if (env.NODE_ENV !== "production") {
  authRouter.post(auth.devLogin, async (c) => {
    const body = await c.req.json<{ userId?: string | number }>();
    const userId = Number(body.userId);
    if (!userId)
      throw new AppError(
        "The userId has to be specified in the request body.",
        400,
      );

    try {
      const user = await authService.getUserById(userId);
      c.var.session.userId = user.id;
      c.set("sessionId", crypto.randomBytes(32).toString("hex"));
      return c.json({ ok: true, userId });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("The specified user was not found.", 400);
    }
  });
}

export { authRouter };
export type AuthType = typeof authRouter;
