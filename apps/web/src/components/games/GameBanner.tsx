import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Game } from "@/hooks/queries/games";

export function GameBanner({
  game,
  heroUrl,
  children,
  className,
}: {
  game?: Game | null;
  heroUrl?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const src = heroUrl ?? game?.heroImgUrl;
  return (
    <motion.div className="relative w-full h-80">
      <AnimatePresence>
        {src && (
          <motion.div
            id="game-banner"
            key={heroUrl ?? game?.slug}
            initial={{ opacity: 0, scale: 1.1, y: -10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: "keyframes" },
            }}
            exit={{
              opacity: 0,
              scale: 1.05,
              y: -10,
              transition: { type: "keyframes" },
            }}
            className="absolute inset-0"
          >
            <img
              src={src}
              alt={game ? `${game.title} banner` : "Banner preview"}
              className="w-full h-full object-cover object-top"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={cn(
          "absolute inset-0 flex flex-row items-center gap-2 p-2",
          className,
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
