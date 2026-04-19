import type { Activity } from "@/types/discord";

/**
 * Returns the URL for a discord activity asset based on the asset string provided by the API.
 * Handles both media proxied URLs and standard application asset URLs.
 * @param activity
 * @param image
 * @returns string
 */
export function getAssetUrl(activity: Activity, image: string): string {
  if (image.startsWith("mp:"))
    return `https://media.discordapp.net/${image.slice(3)}`;
  return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
}
