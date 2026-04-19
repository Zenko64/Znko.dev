/**
 * @name GameEditForm
 * @description A form component for creating or editing a game.
 * @author Zenko
 */
import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Controller, useWatch } from "react-hook-form";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { Input } from "@/components/ui/input";
import { FormFooter } from "@/components/elements/FormFooter";
import { BASE_EDITOR_EXTENSIONS } from "@/lib/editor";
import { EditorBar } from "@/components/posts/editor/ComposerComponents";
import { MediaCarousel } from "./MediaCarousel";
import type { Game } from "@/hooks/queries/games";
import { useGameForm } from "@/hooks/forms/useGameForm";
import { useFilePreview, useMediaManager } from "@/hooks/useMediaManager";
import { useNotifyChange } from "@/hooks/useNotifyChange";
import "@/assets/css/components/postEditor.css";
import { MediaUpload } from "../elements/FormElements";
import { Field, FieldError } from "../ui/field";

const EDITOR_EXTENSIONS = [
  ...BASE_EDITOR_EXTENSIONS,
  Placeholder.configure({ placeholder: "Describe your game..." }),
];

export const GameEditForm = forwardRef(function GameEditForm(
  {
    game,
    mode = "edit",
    onCoverChange,
    onHeroChange,
    onTitleChange,
    onSave,
    onCancel,
  }: {
    game?: Game;
    mode?: "create" | "edit";
    onCoverChange?: (blobUrl: string | null) => void;
    onHeroChange?: (blobUrl: string | null) => void;
    onTitleChange?: (title: string) => void;
    onSave: (saved: Game) => void;
    onCancel: () => void;
  },
  ref,
) {
  const { form, submit, isPending } = useGameForm(game);
  const media = useMediaManager(game?.gameMedia);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: game?.description ?? "",
  });

  const coverFile = useWatch({ control: form.control, name: "cover" });
  const heroFile = useWatch({ control: form.control, name: "hero" });
  const isPublic = useWatch({ control: form.control, name: "public" });

  const coverPreview = useFilePreview(coverFile ?? null);
  const heroPreview = useFilePreview(heroFile ?? null);
  const heroNullified = heroFile === null;

  useNotifyChange(coverPreview ?? null, onCoverChange);
  useNotifyChange(heroPreview ?? null, onHeroChange);

  const carouselItems = useMemo(
    () => [
      ...media.existing.map((item, i) => ({
        key: item.url,
        url: item.url,
        mimeType: item.mimeType,
        onRemove: () => media.removeExisting(i),
      })),
      ...media.pending.map((item, i) => ({
        key: item.blobUrl,
        url: item.blobUrl,
        mimeType: item.file.type,
        onRemove: () => media.removePending(i),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [media.existing, media.pending],
  );

  const handleSubmit = () => {
    form.handleSubmit((values) =>
      submit(values, {
        description: editor?.getHTML() ?? "",
        existingMedia: media.existing,
        newMediaFiles: media.pending.map((p) => p.file),
        onSuccess: onSave,
      }),
    )();
  };

  const changeCover = (file: File) => form.setValue("cover", file);
  useImperativeHandle(ref, () => ({ setCoverFile: changeCover }));

  // null = explicit delete sentinel; useGameForm's submit forwards it as
  // `hero: null` so the backend can drop the existing hero image.
  const changeHero = (file: File | null) => form.setValue("hero", file);

  return (
    <EditorContext.Provider value={{ editor }}>
      <div className="px-4 py-2 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <Controller
            control={form.control}
            name="cover"
            render={({ fieldState }) => (
              <div className="flex flex-col gap-1">
                <MediaUpload
                  placeholder="Select Cover Image"
                  existingLabel={
                    game?.coverImgUrl ? "Current Cover" : undefined
                  }
                  selectedFile={coverFile ?? null}
                  mimeType="image/*"
                  onChange={(file) => file && changeCover(file)}
                  onClear={() => form.resetField("cover")}
                  aria-invalid={!!fieldState.error}
                />
                <FieldError errors={[form.formState.errors.cover]} />
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="hero"
            render={({ fieldState }) => (
              <MediaUpload
                placeholder="Select Hero Image"
                existingLabel={
                  !heroNullified && game?.heroImgUrl ? "Current Hero" : undefined
                }
                clearableExisting
                selectedFile={heroFile instanceof File ? heroFile : null}
                mimeType="image/*"
                onChange={(file) => changeHero(file)}
                onClear={() => changeHero(null)}
                aria-invalid={!!fieldState.error}
              />
            )}
          />
        </div>
        <span className="flex flex-row items-start gap-2">
          <Controller
            control={form.control}
            name="title"
            render={({ fieldState, field }) => (
              <Field data-invalid={!!fieldState.error}>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    onTitleChange?.(e.target.value);
                  }}
                  placeholder="Game title"
                  className="font-bold w-auto min-w-2/5 max-w-/2 field-sizing-content text-lg outline"
                  aria-invalid={!!fieldState.error}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="tags"
            render={({ fieldState, field }) => (
              <Input
                {...field}
                placeholder="Tags (comma separated)"
                className="text-xs w-auto min-w-1/4 max-w-2/3 field-sizing-content"
                aria-invalid={!!fieldState.error}
              />
            )}
          />
        </span>
        <div className="editorWrapper">
          <EditorBar onMediaAdd={(file) => media.addFile(file)} />
          <div className="editorContent">
            <EditorContent editor={editor} />
          </div>
        </div>
        <MediaCarousel slideClassName="h-40" items={carouselItems} />
        <FormFooter
          isPublic={isPublic === true}
          onPublicChange={(v) => form.setValue("public", v)}
          onCancel={onCancel}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel={mode === "create" ? "Create" : "Save"}
          pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
        />
      </div>
    </EditorContext.Provider>
  );
});
