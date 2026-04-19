import { Controller, useWatch } from "react-hook-form";
import { useFilePreview } from "@/hooks/useMediaManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PublicToggle } from "@/components/elements/PublicToggle";
import { useGamesQuery } from "@/hooks/queries/games";
import { GameCombobox } from "../elements/Games";
import { useVideosForm } from "@/hooks/forms/useVideosForm";
import { Spinner } from "../ui/spinner";
import { MediaUpload } from "../elements/FormElements";
import { Field, FieldError } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

export function VideoUploadForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { form, submit, isPending, uploadProgress } = useVideosForm();
  const { data: games = [] } = useGamesQuery();

  const videoFile = useWatch({ control: form.control, name: "video" });
  const thumbnailFile = useWatch({ control: form.control, name: "thumbnail" });
  const thumbnailPreview = useFilePreview(thumbnailFile);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-2">
            <Controller
              control={form.control}
              name="video"
              render={({ field, fieldState }) => (
                <MediaUpload
                  selectedFile={videoFile ?? null}
                  placeholder="Select Video"
                  mimeType="video/*"
                  onClear={() => field.onChange(undefined)}
                  onChange={(file) => field.onChange(file ?? undefined)}
                  aria-invalid={!!fieldState.error}
                />
              )}
            />

            <Controller
              control={form.control}
              name="thumbnail"
              render={({ field, fieldState }) => (
                <MediaUpload
                  selectedFile={field.value ?? null}
                  placeholder="Select Thumbnail"
                  mimeType="image/*"
                  onClear={() => field.onChange(undefined)}
                  onChange={(file) => field.onChange(file ?? undefined)}
                  aria-invalid={!!fieldState.error}
                />
              )}
            />
          </div>
          <FieldError
            errors={[
              form.formState.errors.video,
              form.formState.errors.thumbnail,
            ]}
          />

          {thumbnailPreview && (
            <div className="w-full aspect-video overflow-hidden border border-border/30">
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <Input
                  id="video-title"
                  {...field}
                  placeholder="Title"
                  aria-invalid={!!fieldState.error}
                  className="font-semibold"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Description (optional)"
                rows={3}
                className="resize-none"
              />
            )}
          />

          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <Input {...field} placeholder="Tags (comma separated)" />
            )}
          />

          <Controller
            control={form.control}
            name="gameNanoid"
            render={({ field }) => (
              <GameCombobox
                games={games}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value ?? undefined)}
              />
            )}
          />

          <Controller
            control={form.control}
            name="public"
            render={({ field }) => (
              <PublicToggle
                {...field}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
            )}
          />
        </div>

        {isPending && uploadProgress && <Progress value={uploadProgress} />}
        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={form.handleSubmit((values) =>
              submit(values, () => onOpenChange(false)),
            )}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Spinner />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
