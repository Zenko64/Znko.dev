import z from "zod";

export const profile = z.object({
  displayName: z.string().optional(),
  username: z.string().optional(),
  description: z.string().max(512).optional(),
  avatar: z.string().optional().nullable(),
});

export const post = z.object({
  content: z.string().min(1),
  rating: z.string().optional(),
  pinned: z.boolean().optional(),
  public: z.boolean(),
  media: z.array(z.string()).optional(),
});

export const game = z.object({
  title: z.string().max(64),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  launchDate: z.coerce
    .date()
    .transform((d) => d.toISOString().slice(0, 10))
    .optional(),
  cover: z.string(),
  hero: z.string().nullish(),
  media: z.array(z.string()).optional(),
  public: z.boolean(),
});

export const video = z.object({
  title: z.string().max(64),
  description: z.string().max(2048).optional(),
  tags: z.array(z.string()).optional(),
  gameNanoid: z.string().nullish().optional(),
  public: z.boolean(),
  video: z.string(),
  thumbnail: z.string(),
});

export const postsQuery = z.object({
  search: z.string().optional(),
  uploadedBy: z.string().optional(),
  tagged: z.string().optional(),
});

export const gamesQuery = z.object({
  search: z.string().optional(),
  uploadedBy: z.string().optional(),
  tagged: z.string().optional(),
});

export const videosQuery = z.object({
  search: z.string().optional(),
  game: z.string().optional(),
  uploadedBy: z.string().optional(),
});
