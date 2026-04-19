import { useState } from "react";
import { Link } from "react-router";
import { DeleteIcon, PlayIcon } from "raster-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TagList } from "@/components/elements/TagList";
import { UserRow } from "@/components/elements/UserRow";
import { DeleteConfirmDialog } from "@/components/elements/DeleteConfirmDialog";
import { useVideoTranscodeProgress, type Video } from "@/hooks/queries/videos";
import { Progress } from "../ui/progress";

export function VideoCard({
  video,
  onDelete,
  onEdit,
  isPending,
  className,
}: {
  video: Video;
  onDelete?: () => void;
  onEdit?: () => void;
  isPending?: boolean;
  className?: string;
}) {
  const transcode = useVideoTranscodeProgress(
    video.nanoid,
    video.status !== "ready",
  );
  const encodeStatus = transcode?.status ?? video.status;

  const card = (
    <div className={cn("group relative outline outline-border", className)}>
      <Link
        to={`/videos/${video.nanoid}`}
        className="flex flex-row gap-3 p-3 hover:bg-muted/10 transition-colors"
      >
        {/* Thumbnail */}
        <div className="relative shrink-0 w-42 aspect-video overflow-hidden bg-muted/10 outline outline-border/20">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-110"
          />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30",
              encodeStatus !== "ready" && "opacity-100",
            )}
          >
            <div className="size-8 border border-white/40 flex items-center justify-center bg-black/50">
              {encodeStatus !== "ready" ? (
                <span className="text-xs text-white">
                  {encodeStatus === "processing"
                    ? transcode?.percent
                      ? `${transcode.percent.toFixed(0)}%`
                      : "Processing..."
                    : encodeStatus === "failed"
                      ? "Failed"
                      : "Pending..."}
                </span>
              ) : (
                <PlayIcon className="size-3.5 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-md font-semibold leading-tight truncate">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          )}
          <TagList tags={video.tags ?? []} />
          <UserRow
            avatarUrl={video.user.avatarUrl}
            displayName={video.user.displayName}
            className={cn(
              (video.description || (video.tags ?? []).length > 0) && "mt-auto",
            )}
          />
        </div>
      </Link>
      {encodeStatus === "processing" && transcode?.percent !== undefined && (
        <Progress value={transcode.percent} />
      )}
    </div>
  );

  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  if (!onDelete) return card;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={card} />
      <ContextMenuContent>
        <ContextMenuItem onClick={onEdit}>Edit</ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => setDelConfirmOpen(true)}
        >
          <DeleteIcon />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
      <DeleteConfirmDialog
        title="Delete this Video?"
        description="This action cannot be undone. This will permanently delete this video and all of its data."
        open={delConfirmOpen}
        onOpenChange={setDelConfirmOpen}
        isPending={isPending}
        onConfirm={() => {
          setDelConfirmOpen(false);
          onDelete();
        }}
      />
    </ContextMenu>
  );
}
