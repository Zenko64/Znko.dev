import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "raster-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./button";

/**
 * Full-screen image lightbox with optional shared-layout animation.
 *
 * To get the spring "expand from thumbnail" effect, pass a `layoutId` that
 * matches the `layoutId` you put on the source <motion.img> in the grid/list.
 * Without `layoutId` it simply fades in.
 */
export function Lightbox({
  src,
  onClose,
  layoutId,
  borderRadius = 0,
}: {
  src: string | null;
  onClose: () => void;
  /** Must match the layoutId on the source thumbnail element. */
  layoutId?: string;
  borderRadius?: number;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <motion.div
            layoutId={layoutId}
            style={{ borderRadius, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={src}
              alt=""
              layoutId={layoutId ? `${layoutId}-img` : undefined}
              style={{ maxWidth: "90vw", maxHeight: "90vh", display: "block" }}
            />
          </motion.div>
          <Button
            size="icon"
            onClick={onClose}
            className="absolute top-6 right-6 scale-125"
          >
            <XIcon size={24} strokeWidth={2} />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
