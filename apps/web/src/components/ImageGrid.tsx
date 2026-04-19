import { useState } from "react";
import { motion } from "motion/react";
import { Lightbox } from "./ui/Lightbox";

export type ImageGridImages = [string, string?, string?, string?];

interface ImageGridProps {
  images: ImageGridImages;
  height?: number;
  gap?: number;
  borderRadius?: number;
}

export function ImageGrid({
  images,
  height = 420,
  gap = 5,
  borderRadius = 10,
}: ImageGridProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cols = images.length === 1 ? "1fr" : "1fr 1fr";
  const rows = images.length <= 2 ? "1fr" : "1fr 1fr";

  const cellRadius = (i: number) => {
    if (images.length === 1) return borderRadius;
    if (images.length === 2)
      return i === 0
        ? `${borderRadius}px 0 0 ${borderRadius}px`
        : `0 ${borderRadius}px ${borderRadius}px 0`;
    if (images.length === 3)
      return i === 0
        ? `${borderRadius}px 0 0 ${borderRadius}px`
        : i === 1
          ? `0 ${borderRadius}px 0 0`
          : `0 0 ${borderRadius}px 0`;
    if (i === 0) return `${borderRadius}px 0 0 0`;
    if (i === 1) return `0 ${borderRadius}px 0 0`;
    if (i === 2) return `0 0 0 ${borderRadius}px`;
    return `0 0 ${borderRadius}px 0`;
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gridTemplateRows: rows,
          gap,
          height,
          width: "100%",
        }}
      >
        {images.map((src, i) => (
          <motion.div
            key={i}
            layoutId={src}
            style={{
              position: "relative",
              overflow: "hidden",
              gridRow: images.length === 3 && i === 0 ? "span 2" : undefined,
              cursor: "pointer",
              borderRadius: cellRadius(i),
            }}
            onClick={() => setLightbox(src ?? null)}
          >
            <motion.img
              layoutId={src ? `${src}-img` : undefined}
              src={src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </motion.div>
        ))}
      </div>

      <Lightbox
        src={lightbox}
        onClose={() => setLightbox(null)}
        layoutId={lightbox ?? undefined}
        borderRadius={borderRadius}
      />
    </>
  );
}
