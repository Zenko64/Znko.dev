import z from "zod";

export const imageMime = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const videoMime = z.enum(["video/mp4", "video/webm", "video/quicktime"]);

export const mimeType = z.union([imageMime, videoMime]);

export type ImageMime = z.infer<typeof imageMime>;
export type VideoMime = z.infer<typeof videoMime>;
export type MimeType = z.infer<typeof mimeType>;
