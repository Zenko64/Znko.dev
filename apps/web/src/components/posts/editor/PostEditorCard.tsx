import { AnimatePresence, motion } from "motion/react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FormFooter } from "@/components/elements/FormFooter";
import { EditorContent, EditorContext } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { EditorBar } from "./ComposerComponents";
import { ImageGrid, type ImageGridImages } from "@/components/ImageGrid";

export function PostEditorCard({
  editor,
  isPublic,
  onPublicChange,
  imageUrls,
  onMediaAdd,
  onCancel,
  onSubmit,
  isPending,
  submitLabel = "Post",
  pendingLabel,
  canSubmit = true,
}: {
  editor: Editor | null;
  isPublic: boolean;
  onPublicChange: (v: boolean) => void;
  imageUrls: ImageGridImages;
  onMediaAdd: (file: File) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  canSubmit?: boolean;
}) {
  return (
    <EditorContext.Provider value={{ editor }}>
      <Card className="composeCard p-0! gap-0!">
        <CardContent className="p-0!">
          <div className="editorWrapper">
            <EditorBar
              onMediaAdd={onMediaAdd}
              mediaDisabled={imageUrls.length >= 4}
            />
            <div className="editorContent">
              <EditorContent editor={editor} />
              <AnimatePresence>
                {imageUrls.length > 0 && (
                  <motion.div
                    className="p-4 w-1/2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ImageGrid images={imageUrls} height={200} gap={5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-2!">
          <FormFooter
            isPublic={isPublic}
            onPublicChange={onPublicChange}
            onCancel={onCancel}
            onSubmit={onSubmit}
            isPending={isPending}
            canSubmit={canSubmit}
            submitLabel={submitLabel}
            pendingLabel={pendingLabel}
          />
        </CardFooter>
      </Card>
    </EditorContext.Provider>
  );
}
