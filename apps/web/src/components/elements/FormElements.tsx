import { FilesIcon, ImageIcon, XIcon } from "raster-react";
import { Button } from "../ui/button";
import { cn, openFilePicker } from "@/lib/utils";

type MediaUploadProps = {
  placeholder: string;
  existingLabel?: string;
  // Whether the X button can clear an existing (non-staged) value.
  // Default false — the X only clears a freshly picked `selectedFile`.
  // Set true for fields where deleting the existing value is meaningful
  // (e.g. optional images backed by a backend null-sentinel).
  clearableExisting?: boolean;
  selectedFile: File | null;
  mimeType: string;
  onChange: (file: File | null) => void;
  onClear: () => void;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "onClick" | "type"
>;

/**
 * @name MediaUpload
 * @description A button component that allows users to select a media file to be uploaded. It displays the selected filename and provides a button to remove the file.
 */
export function MediaUpload({
  mimeType,
  placeholder,
  existingLabel,
  clearableExisting = false,
  selectedFile,
  onChange,
  onClear,
  ...props
}: MediaUploadProps) {
  const hasLabel = selectedFile !== null || existingLabel !== undefined;
  const canClear =
    selectedFile !== null || (clearableExisting && existingLabel !== undefined);
  const label = selectedFile
    ? selectedFile.name
    : (existingLabel ?? placeholder);

  return (
    <div className="flex flex-inline justify-start items-center h-7">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "flex items-center justify-start gap-2 px-3 h-full cursor-pointer max-w-48",
          canClear ? "border-r-0" : undefined,
          props.className,
        )}
        onClick={() => openFilePicker(mimeType, onChange)}
        {...props}
      >
        {mimeType.startsWith("image") || mimeType.startsWith("video") ? (
          <ImageIcon className="size-3.5 shrink-0" />
        ) : (
          <FilesIcon className="size-3.5 shrink-0" />
        )}
        <span className={cn("truncate", !hasLabel && "text-muted-foreground")}>
          {label}
        </span>
      </Button>
      {canClear && (
        <Button
          variant="outline"
          className={cn("hover:text-destructive", props.className)}
          size="icon-sm"
          onClick={onClear}
          {...props}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
