import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import { BASE_EDITOR_EXTENSIONS } from "@/lib/editor";
import type { ImageGridImages } from "@/components/ImageGrid";
import { PostEditorCard } from "./PostEditorCard";
import { usePostsForm } from "@/hooks/forms/usePostsForm";
import { useMediaManager } from "@/hooks/useMediaManager";

const EDITOR_EXTENSIONS = [
  ...BASE_EDITOR_EXTENSIONS,
  Placeholder.configure({ placeholder: "What's on your mind?" }),
];

export function ComposeCard({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { form, submit, isPending } = usePostsForm();
  const media = useMediaManager();

  const content = form.watch("content");

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: "",
    onUpdate: ({ editor }) => {
      form.setValue("content", editor.isEmpty ? "" : editor.getHTML());
    },
  });

  const handleSubmit = () => {
    if (!content) return;
    form.setValue(
      "media",
      media.pending.map((m) => m.file),
    );
    form.handleSubmit((values) =>
      submit(values, {
        onSuccess,
      }),
    )();
  };

  return (
    <PostEditorCard
      editor={editor}
      isPublic={form.watch("public")}
      onPublicChange={(v) => form.setValue("public", v)}
      imageUrls={
        media.pending.map((m) => m.blobUrl).slice(0, 4) as ImageGridImages
      }
      onMediaAdd={media.addFile}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel="Post"
      pendingLabel="Posting..."
      canSubmit={!!content}
    />
  );
}
