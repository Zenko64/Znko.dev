import { useState } from "react";

/**
 * @name useFileDrop
 * @description Returns drag-over state and the event handlers to attach to a drop zone.
 * Pass `null` as `onDrop` to disable the drop zone — all handlers become no-ops and
 * `isDragging` stays false, so no extra state is allocated for view-only elements.
 * @param onDrop Called with the dropped File if its type matches `mimePrefix`. Pass null to disable.
 * @param mimePrefix MIME type prefix to validate dropped files (e.g. "image/"). Defaults to "image/".
 */
export function useFileDrop(
  onDrop: ((file: File) => void) | null,
  mimePrefix = "image/",
) {
  const [isDragging, setIsDragging] = useState(false);

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!onDrop) return;
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!onDrop) return;
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith(mimePrefix)) onDrop(file);
    },
  };

  // isDragging is only meaningful when onDrop is active
  return { isDragging: !!onDrop && isDragging, dragProps };
}
