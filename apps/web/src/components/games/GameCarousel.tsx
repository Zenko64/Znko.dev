/**
 * @file GameCarousel.tsx
 * @name GameCarousel
 * @description A horizontally scrollable carousel of game cards.
 * @author Zenko
 */
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { GameBanner } from "./GameBanner";
import { GameCard } from "./GameCard";
import { useGameState } from "./GameStateCtx";
import type { Game } from "@/hooks/queries/games";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

export function GameCarousel({
  games,
  loading,
  onGameSelect,
  onGameEdit,
  onGameDelete,
  onCoverFile,
  currentUserNanoid,
}: {
  games: Game[];
  loading: boolean;
  onGameSelect: (game: Game) => void;
  onGameEdit?: (game: Game) => void;
  onGameDelete?: (game: Game) => void;
  onCoverFile?: (file: File) => void;
  currentUserNanoid?: string;
}) {
  const { isCreating, isEditing, selectedGame, previews } = useGameState();
  const newCardRef = useRef<HTMLDivElement>(null);

  // Use the hero preview blob URL when editing/creating, otherwise show the selected game's hero
  const heroUrl =
    previews.hero ??
    (isCreating ? undefined : selectedGame?.heroImgUrl) ??
    undefined;

  // Scroll the new game card into view when entering create mode
  useEffect(() => {
    if (!isCreating || !newCardRef.current) return;
    newCardRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });
  }, [isCreating]);

  return (
    <GameBanner heroUrl={heroUrl} game={null} className="px-5">
      <motion.div
        className="flex flex-row mt-15 gap-4 w-full min-w-0"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }} // Staggers the appearance of each card
        initial="hidden"
        animate="show"
      >
        <Carousel
          opts={{ dragFree: true }}
          className="w-full min-w-0 **:data-[slot='carousel-content']:overflow-x-visible **:data-[slot='carousel-content']:overflow-y-visible"
        >
          <CarouselContent className="pr-6 py-3">
            {loading ? (
              <Skeleton />
            ) : (
              <>
                {games.map((game) => (
                  <CarouselItem key={game.slug} className="basis-auto">
                    <GameCard
                      game={game}
                      onClick={() => onGameSelect(game)}
                      disabled={isCreating || isEditing}
                      onEdit={onGameEdit && game.user?.nanoid === currentUserNanoid ? () => onGameEdit(game) : undefined}
                      onDelete={
                        onGameDelete && game.user?.nanoid === currentUserNanoid ? () => onGameDelete(game) : undefined
                      }
                      onCoverFile={
                        isEditing && selectedGame?.slug === game.slug
                          ? onCoverFile
                          : undefined
                      }
                    />
                  </CarouselItem>
                ))}
                {isCreating && (
                  <CarouselItem ref={newCardRef} className="basis-auto">
                    <GameCard onCoverFile={onCoverFile} />
                  </CarouselItem>
                )}
              </>
            )}
          </CarouselContent>
        </Carousel>
      </motion.div>
    </GameBanner>
  );
}
