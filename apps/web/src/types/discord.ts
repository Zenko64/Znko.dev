import { shapes } from "@znko/types";
import type { z } from "zod";

export type PresenceData = z.infer<typeof shapes.discord.lanyardPresenceSchema>;
export type Activity = PresenceData["activities"][number];
export type SpotifyData = NonNullable<PresenceData["spotify"]>;

//  Lanyard API Lookup Maps
export const statusLabel: Record<PresenceData["discord_status"], string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

export const statusColor: Record<PresenceData["discord_status"], string> = {
  online: "bg-green-500",
  idle: "bg-yellow-400",
  dnd: "bg-red-500",
  offline: "bg-zinc-500",
};

export const activityBadge: Record<number, string> =
  shapes.discord.activityTypeNames;
