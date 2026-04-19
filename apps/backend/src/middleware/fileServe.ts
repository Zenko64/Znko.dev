/**
 * @file fileServe.ts
 * @module middleware/fileServe
 * @description Middleware to serve files from the UPLOADS_DIR.
 * Comes with security headers, ETag support, and Range request support.
 * Only serves files within UPLOADS_DIR.
 * This was made because staticServer did not support all of the necessary headers.
 * OK
 */
import { env } from "#core/env";
import pathOps from "#functions/paths";
import { createMiddleware } from "hono/factory";

/**
 * @name INLINE_SAFE_MIMES
 * @description A set of MIME Types that are safe to display inline without risk of XSS.
 * These do not need the Content-Disposition: attachment header.
 */
const INLINE_SAFE_MIMES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
]);

/**
 * @name fileServe
 * @description Middleware to serve files from the UPLOADS_DIR.
 * Comes with security headers, ETag support, and Range request support.
 * Only serves files within UPLOADS_DIR.
 */
const fileServe = createMiddleware(async (c, next) => {
  const filePath = pathOps.fsPathFromUrl(c.req.path);
  if (!filePath) return next();
  const file = Bun.file(filePath);
  if (!(await file.exists())) return next();

  const requestedRange = c.req.header("Range")?.match(/bytes=(\d*)-(\d*)/);
  const etag = requestedRange
    ? `W/"${file.size}-${file.lastModified}"`
    : `"${file.size}-${file.lastModified}"`;
  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, { status: 304 });
  }
  const processedFile = requestedRange
    ? file.slice(
        Number(requestedRange[1]),
        (Number(requestedRange[2]) || file.size - 1) + 1,
      )
    : file;
  const mime = file.type.split(";")[0].trim().toLowerCase();
  const headers: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Length": processedFile.size.toString(),

    "Content-Type": file.type,
    ETag: etag,
    "Cache-Control":
      env.NODE_ENV === "production"
        ? "public, max-age=0, must-revalidate, stale-if-error=86400"
        : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; sandbox; frame-ancestors 'none'; base-uri 'none'",
    "Cross-Origin-Resource-Policy": "same-site",
  };
  if (requestedRange) {
    headers["Content-Range"] =
      `bytes ${requestedRange[1]}-${requestedRange[2] || file.size - 1}/${file.size}`;
  }
  if (!INLINE_SAFE_MIMES.has(mime)) {
    headers["Content-Disposition"] = "attachment";
  }
  return new Response(processedFile, {
    headers,
    status: requestedRange ? 206 : 200,
  });
});

export default fileServe;
