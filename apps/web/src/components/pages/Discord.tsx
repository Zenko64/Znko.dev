/**
 * This file includes the components required for rendering Discord presence and activities on the web page.
 * It uses websockets to acquire the data and renders them in a user friendly component.
 */
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Activity, SpotifyData } from "@/types/discord";
import { statusLabel, statusColor, activityBadge } from "@/types/discord";
import { useClock } from "@/hooks";
import { getAssetUrl } from "@/utils/discord";
import { formatDuration } from "@/utils";
import { usePresence } from "@/hooks/usePresence";
import "@/assets/css/components/discord.css";

/**
 * A card component that displays a single Discord activity or Spotify listening status.
 * @param activity The Discord activity to display.
 * @param spotify Optional Spotify data if the activity is a Spotify listening activity.
 * @param now The current timestamp in milliseconds, used for calculating elapsed time and progress.
 * @returns The rendered activity card.
 */
function ActivityCard({
  activity,
  spotify,
  now,
}: {
  activity: Activity;
  spotify?: SpotifyData;
  now: number;
}) {
  // Determine if the activity is Spotify based on its type and presence of Spotify data
  const isSpotify = activity.type === 2 && !!spotify;

  // Obtain the appropriate image URL for the activity. If theres a Spotify art take it instead.
  const imageUrl = isSpotify
    ? spotify!.album_art_url
    : activity.assets?.large_image && activity.application_id
      ? getAssetUrl(activity, activity.assets.large_image)
      : null;

  // Return the activity details.
  const title = isSpotify ? spotify!.song : activity.name;
  const line2 = isSpotify ? spotify!.artist : activity.details;
  const line3 = isSpotify ? spotify!.album : activity.state;

  // Spotify progress calculation
  const elapsed = isSpotify ? now - spotify!.timestamps.start : 0;
  const duration = isSpotify
    ? spotify!.timestamps.end - spotify!.timestamps.start
    : 0;
  const progress = isSpotify ? Math.min(1, elapsed / duration) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="activity-card-body">
          {imageUrl && (
            <img src={imageUrl} alt={title} className="activity-img" />
          )}
          <div className="activity-info">
            <CardTitle>{title}</CardTitle>
            {line2 && <CardDescription>{line2}</CardDescription>}
            {line3 && <CardDescription>{line3}</CardDescription>}
            {isSpotify && (
              <div className="activity-progress">
                <div className="activity-progress-bar">
                  <div
                    className="activity-progress-fill"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="activity-progress-times">
                  <span>{formatDuration(elapsed)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
            )}
            {!isSpotify && activity.timestamps?.start && (
              <CardDescription className="mt-1">
                {formatDuration(now - activity.timestamps.start)} elapsed
              </CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="activity-badge">
            {activityBadge[activity.type] ?? "Active"}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * The main component that displays the user's current Discord presence, including their status and activities.
 * @returns The rendered presence component.
 */
export function Activity() {
  const { data, error } = usePresence();
  const now = useClock();

  const activities = data?.activities.filter((a) => a.type !== 4) ?? [];

  if (error)
    return <p className="text-muted-foreground">Failed to load activity.</p>;
  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="flex flex-col gap-4 p-4 mt-16">
      <span className="inline-flex items-center gap-2">
        <span
          className={`size-3 rounded-full ${statusColor[data.discord_status]}`}
        />
        <span className="text-xs text-muted-foreground">
          {statusLabel[data.discord_status]}
        </span>
      </span>

      {activities.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Not doing anything right now.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              spotify={activity.type === 2 ? data.spotify ?? undefined : undefined}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
