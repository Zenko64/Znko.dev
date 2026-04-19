/**
 * @name paths
 * @module functions/paths
 * @description Utility functions for safely converting URL paths.
 * @file paths.ts
 */
import { env } from "#core/env";
import { ROUTES } from "@znko/consts";
import { isAbsolute, join, relative, resolve } from "path";
import { dirStruct } from "#/constants";

const UPLOADS_PREFIX = ROUTES.uploads + "/";

/**
 * @name fsPathFromUrl
 * @description Converts a public URL path to a safe absolute filesystem path.
 * It returns null if the URL path is invalid.
 * @param urlPath - The public URL path to convert
 * @returns Absolute Filesystem Path, or null if invalid.
 */
function fsPathFromUrl(urlPath: string): string | null {
  const pathname = decodeURIComponent(new URL(urlPath, env.APP_URL).pathname);
  const stripped = pathname.slice(UPLOADS_PREFIX.length);
  const filePath = resolve(join(dirStruct.uploads, stripped));
  const rel = relative(dirStruct.uploads, filePath);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  return filePath;
}

/**
 * @name urlFromPath
 * @description Converts a relative path inside the UPLOADS_DIR to a public URL path.
 * @param relPath - The relative path to convert
 * @returns The public URL path for the item inside the UPLOADS_DIR.
 * @throws {AppError} If the resulting URL path is invalid.
 */
function urlFromPath(path: string): string {
  const normalised = relative(dirStruct.uploads, path).replace(/\\/g, "/");
  return new URL(UPLOADS_PREFIX + normalised, env.APP_URL).pathname;
}

export default {
  fsPathFromUrl,
  urlFromPath,
};
