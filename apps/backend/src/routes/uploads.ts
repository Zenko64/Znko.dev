import { requireAuth } from "#middleware/requireAuth";
import { getAuthUser } from "#security/ownership";
import tempOps from "#core/storage";
import type { AppEnv } from "#types/hono";
import {
  type AnyWebReadableByteStreamWithFileType,
  type FileTypeResult,
  fileTypeStream,
} from "file-type";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import { Readable } from "stream";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

// TODO: Analyse and JSDoc

const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_MIMES = new Set<string>([...IMAGE_MIMES, ...VIDEO_MIMES]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5GB covers bigger videos

export const uploadsRouter = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  bodyLimit({
    maxSize: MAX_UPLOAD_BYTES,
    onError: (c) => c.json({ error: "File too large" }, 413),
  }),
  async (c) => {
    const body = c.req.raw.body;
    if (!body) {
      return c.json({ error: "No file provided" }, 400);
    }
    const user = getAuthUser(c);

    const rawFileStream = await fileTypeStream(
      Readable.fromWeb(body as never) as never, // required for Bun.
    );
    if (!rawFileStream.fileType) {
      return c.json({ error: "Could not determine file type" }, 400);
    }
    if (!ALLOWED_MIMES.has(rawFileStream.fileType.mime)) {
      return c.json(
        { error: `Unsupported file type: ${rawFileStream.fileType.mime}` },
        415,
      );
    }

    const processed = await processFileStream(rawFileStream as ReadableStream);
    const id = await tempOps.stageTempFile(
      processed.body as unknown as BodyInit,
      { mimeType: processed.fileType.mime, ext: processed.fileType.ext },
      user.userId,
    );

    return c.json({ id });
  },
);

async function processFileStream(
  stream: AnyWebReadableByteStreamWithFileType,
): Promise<{ body: Uint8Array | ReadableStream; fileType: FileTypeResult }> {
  if (!stream.fileType) {
    throw new Error("The provided stream is missing data.");
  }
  const { mime } = stream.fileType;

  if (mime.startsWith("image/")) {
    const transformer = sharp({ animated: mime === "image/gif" })
      .rotate()
      .toFormat(mime === "image/gif" ? "gif" : "webp", { quality: 85 });
    (stream as unknown as Readable).pipe(transformer);
    const isGif = mime === "image/gif";
    return {
      body: new Uint8Array(await transformer.toBuffer()),
      fileType: isGif
        ? stream.fileType
        : { ...stream.fileType, ext: "webp", mime: "image/webp" },
    };
  }

  if (VIDEO_MIMES.has(mime)) {
    // The HLS Reencoding is done in the Post request after its commited because of the folder struct
    const buffer = await new Response(
      stream as unknown as ReadableStream,
    ).arrayBuffer();
    return {
      body: new Uint8Array(buffer),
      fileType: stream.fileType,
    };
  }

  throw new Error(`Unsupported mime in processFileStream: ${mime}`);
}
