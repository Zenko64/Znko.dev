import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Button } from "../../ui/button";
import {
  BoldIcon,
  CheckIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  StrikethroughIcon,
  UnderlineIcon,
  XIcon,
} from "lucide-react";
import { Input } from "../../ui/input";
import { useRef, useState } from "react";

export function EditorBar({
  onMediaAdd,
  mediaDisabled,
}: {
  onMediaAdd?: (file: File) => void;
  mediaDisabled?: boolean;
}) {
  const { editor } = useCurrentEditor();
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onMediaAdd?.(file);
    e.target.value = "";
  };
  const { isBold, isItalic, isLink, isStrike, isUnderline } = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isLink: ctx.editor?.isActive("link") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isUnderline: ctx.editor?.isActive("underline") ?? false,
    }),
  }) ?? {
    isBold: false,
    isItalic: false,
    isLink: false,
    isStrike: false,
    isUnderline: false,
  };

  const applyLink = () => {
    const href = /^https?:\/\//.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
    editor?.chain().setLink({ href }).run();
    setLinkOpen(false);
  };

  if (!editor) return null;
  return (
    <div className="editorBar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="icon"
        className={isBold ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={isItalic ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={isStrike ? "active" : ""}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={isUnderline ? "active" : ""}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </Button>

      <Button
        variant="outline"
        size="icon"
        disabled={mediaDisabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon />
      </Button>

      <Popover
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (open) {
            const href = editor.getAttributes("link").href;
            if (href) setLinkUrl(href);
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={isLink ? "active" : ""}
            >
              <LinkIcon />
            </Button>
          }
        />
        <PopoverContent className="flex w-auto flex-row gap-1 p-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
            className="h-7 w-56 text-xs"
          />
          <Button size="icon" className="h-7 w-7" onClick={applyLink}>
            <CheckIcon />
          </Button>
          {isLink && (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                editor.chain().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              <XIcon />
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function EditorFloatingMenu() {
  const { editor } = useCurrentEditor();
  if (!editor) return null;
  return <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>;
}
