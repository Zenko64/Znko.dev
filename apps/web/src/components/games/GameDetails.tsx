/**
 * @file GameDetails.tsx
 * @name GameDetails
 * @description Displays detailed information about a game, including a carousel of media and a list of videos.
 * @author Zenko
 */
import { useMemo, useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";
import { TagList } from "@/components/elements/TagList";
import { MediaCarousel } from "./MediaCarousel";
import type { Game } from "@/hooks/queries/games";
import { useVideosQuery } from "@/hooks/queries/videos";
import { VideoCard } from "../videos/VideoCard";
import { Separator } from "../ui/separator";

export function GameDetails({ game }: { game: Game }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { data: videoData, isLoading: videosLoading } = useVideosQuery({
    game: game.slug,
  });

  const carouselItems = useMemo(
    () =>
      (game.gameMedia ?? []).map((item) => ({
        key: item.url,
        url: item.url,
        mimeType: item.mimeType,
        layoutId: !item.mimeType?.startsWith("video/") ? item.url : undefined,
        onClick: !item.mimeType?.startsWith("video/")
          ? () => setLightbox(item.url)
          : undefined,
      })),
    [game.gameMedia],
  );

  return (
    <div className="px-4 py-2 flex flex-col gap-1.5">
      <span className="flex flex-row items-center gap-2">
        <h3 className="text-lg font-bold">{game.title}</h3>
        <TagList tags={game.tags ?? []} variant="solid" />
      </span>
      <Separator />

      <div
        className="ProseMirror text-sm text-muted-foreground game-details"
        dangerouslySetInnerHTML={{ __html: game.description }}
      />

      <MediaCarousel
        className="mt-4"
        slideClassName="h-80"
        items={carouselItems}
      />

      <Lightbox
        src={lightbox}
        onClose={() => setLightbox(null)}
        layoutId={lightbox ?? undefined}
        borderRadius={16}
      />

      {videoData && !videosLoading && videoData.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <h1>Videos</h1>
          {videoData.map((video) => (
            <VideoCard key={video.nanoid} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
