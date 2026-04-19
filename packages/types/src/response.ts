import z from "zod";

/** A single media item as returned by the API (url + mimeType). */
export const mediaItem = z.object({
  url: z.string(),
  mimeType: z.string(),
});
