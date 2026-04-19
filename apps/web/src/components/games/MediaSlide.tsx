import { XIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function MediaSlide({
  url,
  mimeType,
  alt,
  className,
  layoutId,
  onRemove,
  onClick,
}: {
  url: string;
  mimeType?: string | null;
  alt?: string;
  className?: string;
  layoutId?: string;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {mimeType?.startsWith("video/") ? (
        <video src={url} controls className="w-full h-full object-cover" />
      ) : (
        <motion.img
          layoutId={layoutId ? `${layoutId}-img` : undefined}
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
        />
      )}
      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <XIcon className="size-3.5" />
        </Button>
      )}
    </motion.div>
  );
}
