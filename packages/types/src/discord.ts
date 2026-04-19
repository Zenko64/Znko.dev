/**
 *  This type was made from a response taken from a self-hosted lanyard server
 *  Using the websocket API.
 */
import z from "zod";

const discordStatuses = z.enum(["online", "idle", "dnd", "offline"]);

const activityType = z.union([
  z.literal(0), // Playing
  z.literal(1), // Streaming
  z.literal(2), // Listening
  z.literal(3), // Watching
  z.literal(4), // Custom
  z.literal(5), // Competing
]);

const activityAssets = z.object({
  large_image: z.string().optional(),
  large_text: z.string().optional(),
  small_image: z.string().optional(),
  small_text: z.string().optional(),
});

const activity = z.object({
  id: z.string(),
  name: z.string(),
  type: activityType,
  created_at: z.number(),
  details: z.string().optional(),
  state: z.string().optional(),
  flags: z.number().optional(),
  session_id: z.string().optional(),
  application_id: z.string().optional(),
  platform: z.string().optional(),
  timestamps: z
    .object({
      start: z.number().optional(),
      end: z.number().optional(),
    })
    .optional(),
  assets: activityAssets.optional(),
  party: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
  sync_id: z.string().optional(),
  buttons: z.array(z.string()).optional(),
});

const spotifyData = z.object({
  song: z.string(),
  artist: z.string(),
  album: z.string(),
  album_art_url: z.url(),
  track_id: z.string().length(22),
  timestamps: z.object({
    start: z.number(),
    end: z.number(),
  }),
});

// Export these types.
export const lanyardPresenceSchema = z.object({
  discord_status: discordStatuses,
  active_on_discord_web: z.boolean(),
  active_on_discord_desktop: z.boolean(),
  active_on_discord_mobile: z.boolean(),
  active_on_discord_embedded: z.boolean(),
  active_on_discord_vr: z.boolean(),
  listening_to_spotify: z.boolean(),
  spotify: spotifyData.nullable(),
  activities: z.array(activity),
});

// Use this to lookup the activity type easier
export const activityTypeNames: Record<number, string> = {
  0: "Playing",
  1: "Streaming",
  2: "Listening",
  3: "Watching",
  4: "Custom",
  5: "Competing",
};
