import { useState } from "react";
import { motion } from "motion/react";
import { PlayIcon, PlusIcon } from "raster-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useVideosQuery, useDeleteVideoMutation } from "@/hooks/queries/videos";
import { VideoCard } from "./VideoCard";
import { VideoUploadForm } from "./VideoUploadForm";
import { EmptyState } from "../elements/EmptyState";
import { SearchBar } from "../elements/SearchBar";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";

function FadeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function VideosDisplay() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: videos = [], isLoading } = useVideosQuery({
    search,
  });
  const deleteMutation = useDeleteVideoMutation();
  const [deletingNanoid, setDeletingNanoid] = useState<string | null>(null);

  return (
    <div className="relative flex flex-col">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex w-1/2">
          <SearchBar placeholder="Search videos..." onSearch={setSearch} />
        </div>
        <div className="flex justify-end flex-1">
          {user && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => setUploadOpen(true)}
            >
              <PlusIcon />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col w-full h-[calc(100vh-var(--navbar-height)-62px)] mt-[62px]">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] w-full" />
            ))}
          </div>
        ) : videos.length === 0 && !search ? (
          <FadeIn>
            <EmptyState
              className="h-full"
              icon={<PlayIcon className="size-8" />}
              title="No Videos Yet."
              description={
                <>
                  No videos have been posted yet.
                  {user && " You can be the first to upload one!"}
                </>
              }
              action={
                user && (
                  <Button onClick={() => setUploadOpen(true)}>
                    Post New Video
                  </Button>
                )
              }
            />
          </FadeIn>
        ) : videos.length === 0 ? (
          <FadeIn>
            <EmptyState
              className="h-full"
              icon={<PlayIcon className="size-8" />}
              title="No results found."
              description={
                <>No Videos Match &ldquo;{search}&rdquo;.</>
              }
            />
          </FadeIn>
        ) : (
          videos.map((video) => (
            <VideoCard
              key={video.nanoid}
              video={video}
              onDelete={
                user && video.user?.username === user.username
                  ? () => {
                      setDeletingNanoid(video.nanoid);
                      deleteMutation.mutate(video.nanoid, {
                        onSettled: () => setDeletingNanoid(null),
                      });
                    }
                  : undefined
              }
              onEdit={() =>
                navigate(`/videos/${video.nanoid}`, {
                  state: { edit: true },
                })
              }
              isPending={
                deleteMutation.isPending && deletingNanoid === video.nanoid
              }
            />
          ))
        )}
      </div>
      <VideoUploadForm open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
