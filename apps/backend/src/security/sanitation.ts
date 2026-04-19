import { env } from "#core/env";
import logger from "#core/logging";

export function redirect(path: string | undefined): string | undefined {
  if (!path) return undefined;
  try {
    const url = new URL(path, env.APP_URL); // Base URL is required to parse relative paths
    if (url.origin !== env.APP_URL) {
      // If this branch is hit, the path is malicious. Return undefined.
      logger.warn("[SECURITY] Open redirect attempt blocked!", { path });
      return undefined;
    }
    return url.pathname + url.search;
  } catch (e) {
    return undefined;
  }
}

export default {
  redirect,
};
