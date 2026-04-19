import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteIcon, FileTextIcon, MenuIcon, ShareIcon } from "raster-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/elements/DeleteConfirmDialog";
import { UserRow } from "@/components/elements/UserRow";
import { useAuth } from "@/providers/AuthProvider";
import { BASE_EDITOR_EXTENSIONS } from "@/lib/editor";
import { ImageGrid, type ImageGridImages } from "@/components/ImageGrid";
import type { Post } from "@/hooks/queries/posts";
import { useEditor } from "@tiptap/react";
import { PostEditorCard } from "./editor/PostEditorCard";
import { useDeletePostMutation } from "@/hooks/queries/posts";
import { usePostsForm } from "@/hooks/forms/usePostsForm";
import { useMediaManager } from "@/hooks/useMediaManager";
import "@/assets/css/components/postEditor.css";

export function PostLink({ post }: { post: Post }) {
  const { user } = useAuth();
  const deleteMutation = useDeletePostMutation();
  const { form, submit, isPending } = usePostsForm(post);
  const media = useMediaManager(post.postMedia);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const editor = useEditor({
    extensions: BASE_EDITOR_EXTENSIONS,
    content: post.content,
  });

  const allImageUrls = [
    ...media.existing
      .filter((m) => m.mimeType.startsWith("image/"))
      .map((m) => m.url),
    ...media.pending
      .filter((m) => m.file.type.startsWith("image/"))
      .map((m) => m.blobUrl),
  ].slice(0, 4) as ImageGridImages;

  const imageUrls = post.postMedia
    .filter((m) => m.mimeType.startsWith("image/"))
    .map((m) => m.url)
    .slice(0, 4) as ImageGridImages;

  const handleMediaAdd = (file: File) => {
    if (allImageUrls.length >= 4) return;
    media.addFile(file);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/posts?id=${post.nanoid}`,
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset({ content: post.content, public: post.public });
    editor?.commands.setContent(post.content);
  };

  const handleSave = () => {
    if (!editor || editor.isEmpty) return;
    form.setValue("content", editor.getHTML());
    form.setValue("public", form.getValues("public"));
    form.handleSubmit((values) =>
      submit(values, {
        existingMedia: media.existing,
        newMediaFiles: media.pending.map((m) => m.file),
        onSuccess: () => setIsEditing(false),
      }),
    )();
  };

  return (
    <>
      {isEditing ? (
        <PostEditorCard
          editor={editor}
          isPublic={form.watch("public")}
          onPublicChange={(v) => form.setValue("public", v)}
          imageUrls={allImageUrls}
          onMediaAdd={handleMediaAdd}
          onCancel={handleCancel}
          onSubmit={handleSave}
          isPending={isPending}
          submitLabel="Save"
          pendingLabel="Saving..."
          canSubmit={!!editor && !editor.isEmpty}
        />
      ) : (
        <Card className="postHeader gap-0 mt-0 p-0!">
          <CardContent className="flex flex-col">
            <div
              className="postContent ProseMirror"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            {imageUrls.length > 0 && (
              <div className="pb-4 w-1/2">
                <ImageGrid images={imageUrls} height={200} gap={5} />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <motion.span
              className="flex items-center gap-2 justify-between w-full"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <UserRow
                avatarUrl={post.user.avatarUrl}
                displayName={post.user.displayName}
                size="md"
              />
              <span className="flex flex-row gap-0.5 items-center">
                <p className="date">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        variant="outline"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuIcon size={30} />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={handleShare}>
                        <ShareIcon /> Share
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {user && user.username === post.user.username && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <FileTextIcon /> Edit Post
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteOpen(true)}
                          >
                            <DeleteIcon /> Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </motion.span>
          </CardFooter>
        </Card>
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this post?"
        description="This action cannot be undone. This will permanently delete this post and all of its data."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(post.nanoid)}
      />
    </>
  );
}
