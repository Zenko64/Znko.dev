/**
 * @name AppContext
 * @description These types are used by the Hono server
 * to define the context (Context is the type of the C parameter along with its Methods)
 * and env, (Env is the type of c.env which stores variables for each user request)
 * the context
 * @module types/hono
 * @author Zenko
 * @version 1.0.0
 * OK
 */
import type { Context } from "hono";

// The SessionData is stored internally in Redis
type SessionData = {
  pkceCodeVerifier?: string; // The PKCE Code Verifier. Unhashed. Stored ONLY Server-side. Server will send it from redis, and the Provider will re-hash it and compare with the hashed version also sent by the client.
  state?: string;
  userId?: number;
  redirect?: string;
  _destroyed?: boolean; // Internal flag to indicate session destruction
};

export type AppEnv = {
  Variables: {
    sessionId: string;
    session: SessionData;
  };
};

// The AppContext
export type AppContext = Context<AppEnv>;
