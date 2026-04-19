import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { MediaSlide } from "./MediaSlide";

export type MediaCarouselItem = {
  /** Unique key for the list — use the URL or blob URL. */
  key: string;
  url: string;
  mimeType?: string | null;
  alt?: string;
  /** Passed to MediaSlide for shared layout animations (lightbox). */
  layoutId?: string;
  onClick?: () => void;
  onRemove?: () => void;
};

/**
 * @name MediaCarousel
 * @description A horizontally scrollable carousel of media slides. Used in both the
 * read-only GameDetails view (with lightbox support) and the editable GameEditForm
 * (with remove buttons). Pass `onRemove` per item to enable edit mode for that slide.
 */
export function MediaCarousel({
  items,
  className,
  slideClassName,
}: {
  items: MediaCarouselItem[];
  /** Extra className on the Carousel root. */
  className?: string;
  /** Height/sizing class applied to every MediaSlide (e.g. "h-80" or "h-40"). */
  slideClassName?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Carousel opts={{ align: "start" }} className={className}>
      <CarouselContent>
        {items.map((item) => (
          <CarouselItem key={item.key} className="basis-auto">
            <MediaSlide
              url={item.url}
              mimeType={item.mimeType}
              alt={item.alt}
              className={slideClassName}
              layoutId={item.layoutId}
              onClick={item.onClick}
              onRemove={item.onRemove}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
