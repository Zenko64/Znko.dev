import { useCallback, useEffect, useState } from "react";
import {
  MediaPlayer,
  MediaProvider,
  isVideoProvider,
  isHLSProvider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { DeleteIcon } from "raster-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackNavLink } from "@/components/elements/BackNavLink";
import { ShareButton } from "@/components/elements/ShareButton";
import { TagList } from "@/components/elements/TagList";
import { UserRow } from "@/components/elements/UserRow";
import { FormFooter } from "@/components/elements/FormFooter";
import { DeleteConfirmDialog } from "@/components/elements/DeleteConfirmDialog";
import { useAuth } from "@/providers/AuthProvider";
import { useVideoQuery, useDeleteVideoMutation } from "@/hooks/queries/videos";
import { useGamesQuery } from "@/hooks/queries/games";
import { useVideosForm } from "@/hooks/forms/useVideosForm";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { GameCombobox } from "@/components/elements/Games";

export function VideoDetail() {
  const { nanoid } = useParams<{ nanoid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { data: video, isLoading } = useVideoQuery(nanoid);
  const { data: games = [] } = useGamesQuery();
  const deleteMutation = useDeleteVideoMutation();

  const [confirmDelete, setConfirmDelete] = useState(false);
  // Initialize isEditing from navigation state so no effect needed for that case
  const [isEditing, setIsEditing] = useState(() => !!location.state?.edit);
  const { form, submit, isPending } = useVideosForm(video);

  const game = video?.game ?? null;
  const isOwner = !!user && !!video && video.user?.username === user.username;

  const onProviderSetup = useCallback(
    (provider: MediaProviderAdapter | null) => {
      if (isVideoProvider(provider) || isHLSProvider(provider)) {
        provider.video.preservesPitch = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (provider.video as any).webkitPreservesPitch = false;
      }
    },
    [],
  );

  const handleDelete = () => {
    if (!nanoid) return;
    deleteMutation.mutate(nanoid, { onSuccess: () => navigate("/videos") });
  };

  const startEditing = () => setIsEditing(true);

  // Reset form fields when video loads (defaultValues only apply at hook init time)
  useEffect(() => {
    if (video)
      form.reset({
        title: video.title,
        tags: (video.tags ?? []).join(", "),
        description: video.description ?? "",
        gameNanoid: video.game?.nanoid ?? undefined,
        public: video.public,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.nanoid]); // only re-run when a different video is loaded, not on every render

  // Clear navigation state after using it to open edit mode
  useEffect(() => {
    if (location.state?.edit)
      navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = form.handleSubmit((values) =>
    submit(values, () => setIsEditing(false)),
  );

  if (isLoading) {
    return (
      <div className="p-4 text-xs text-muted-foreground/40 font-mono">
        loading...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="p-4 text-xs text-muted-foreground/40 font-mono">
        video not found.{" "}
        <Link to="/videos" className="underline underline-offset-2">
          go back
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col"
    >
      <BackNavLink to="/videos" label="Videos" />
      {video.url && (
        <MediaPlayer
          src={video.url}
          poster={video.thumbnailUrl ?? undefined}
          className="w-full aspect-video border-b border-border/20"
          onProviderSetup={onProviderSetup}
        >
          <MediaProvider />
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={isEditing ? "edit" : "view"}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {isEditing ? (
            <Card className="pt-0">
              <CardContent className="flex flex-col gap-3 pt-4">
                <Field data-invalid={!!form.formState.errors.title}>
                  <FieldLabel htmlFor="edit-title">Title</FieldLabel>
                  <Input
                    id="edit-title"
                    aria-invalid={!!form.formState.errors.title}
                    value={form.watch("title")}
                    onChange={(e) => form.setValue("title", e.target.value)}
                    placeholder="Title"
                    className="font-bold"
                  />
                  <FieldError errors={[form.formState.errors.title]} />
                </Field>
                <Input
                  value={form.watch("tags")}
                  onChange={(e) => form.setValue("tags", e.target.value)}
                  placeholder="Tags (comma separated)"
                />
                <Textarea
                  value={form.watch("description")}
                  onChange={(e) => form.setValue("description", e.target.value)}
                  placeholder="Description"
                  rows={4}
                  className="resize-none"
                />
                <GameCombobox
                  games={games}
                  onValueChange={(v) =>
                    form.setValue("gameNanoid", v ?? undefined)
                  }
                  value={form.watch("gameNanoid") ?? null}
                />
                <FormFooter
                  isPublic={form.watch("public") === true}
                  onPublicChange={(v) => form.setValue("public", v)}
                  onCancel={() => setIsEditing(false)}
                  onSubmit={handleSave}
                  isPending={isPending}
                  canSubmit={!!form.watch("title")?.trim()}
                  pendingLabel="Saving..."
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="pt-0">
              <CardHeader className="flex flex-row justify-between items-center py-4 border-y">
                <span className="flex flex-col gap-1">
                  <h1 className="text-sm font-bold leading-snug">
                    {video.title}
                  </h1>
                  <TagList tags={video.tags ?? []} />
                  <UserRow
                    avatarUrl={video.user.avatarUrl}
                    displayName={video.user.displayName}
                    size="md"
                  />
                </span>
                <span className="flex flex-row items-center gap-2">
                  {isOwner && (
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      Edit
                    </Button>
                  )}
                  <ShareButton />
                  {isOwner && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <DeleteIcon />
                    </Button>
                  )}
                </span>
              </CardHeader>

              {(video.description || game) && (
                <CardContent className="flex flex-col gap-2">
                  {video.description && (
                    <CardDescription>
                      <p className="leading-relaxed">{video.description}</p>
                    </CardDescription>
                  )}
                  {game && (
                    <div
                      onClick={() => navigate(`/games/${game.slug}`)}
                      className="cursor-pointer flex flex-row gap-3 border border-border bg-muted/5 w-fit"
                    >
                      {game.coverImgUrl && (
                        <div className="w-15 aspect-2/3 overflow-hidden shrink-0">
                          <img
                            src={game.coverImgUrl}
                            alt={game.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex flex-col justify-center gap-1 py-2 pr-3">
                        <span className="text-xs font-semibold leading-tight">
                          {game.title}
                        </span>
                        {game.rating != null && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {game.rating} / 10
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${video.title}"?`}
        description="This will permanently remove the video and cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </motion.div>
  );
}
