/**
 * @file GameCard.tsx
 * @name GameCard
 * @description A card component that displays a game's cover image and the title. Used in a carousel. If actions are passed, they are shown in a context menu.
 * @author Zenko
 */
import { motion } from "motion/react";
import { DeleteIcon, FileTextIcon, PlusIcon } from "raster-react";
import { cn, openFilePicker } from "@/lib/utils";
import { useFileDrop } from "@/hooks/useFileDrop";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import "@/assets/css/components/game.css";
import { useGameState } from "./GameStateCtx";
import type { Game } from "@/hooks/queries/games";

export function GameCard({
  game,
  disabled,
  onEdit,
  onDelete,
  onClick,
  onCoverFile,
}: {
  /** Omit for the "add new" placeholder card shown while creating. */
  game?: Game;
  disabled?: boolean;
  onCoverFile?: (file: File) => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { selectedGame, previews } = useGameState();
  const { isDragging: isDraggingOver, dragProps } = useFileDrop(
    onCoverFile ?? null,
  );

  const isNew = !game; // If no game is provided, it means it is a game thats being created
  const isSelected = !isNew && selectedGame?.slug === game.slug;
  const coverSrc =
    (isNew || isSelected) && previews.cover
      ? previews.cover
      : game?.coverImgUrl;

  const card = (
    <motion.div
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 shrink-0 origin-bottom",
        !isNew && !disabled && "cursor-pointer",
      )}
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      exit={{ opacity: 0, y: 16 }}
      animate={{ scale: isSelected ? 1.08 : 1, opacity: 1, y: 0 }}
      whileHover={{ filter: "brightness(1.15)" }}
    >
      <motion.div
        onClick={(e) => {
          if (!onCoverFile) return; // only active in edit/create mode
          e.stopPropagation(); // prevent triggering the card's outer onClick (game selection)
          openFilePicker("image/*", onCoverFile);
        }}
        {...dragProps}
        className={cn(
          "relative w-32 aspect-2/3 rounded-[10px] flex items-center justify-center transition-colors duration-100",
          isNew
            ? [
                "border-2 border-dashed bg-background/80",
                isDraggingOver
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/30"
                  : "border-muted-foreground text-muted-foreground",
              ]
            : [
                "overflow-hidden border-2 border-transparent",
                isSelected && "game-card-gradient-border",
              ],
          onCoverFile && "cursor-pointer",
        )}
        animate={
          !isNew
            ? {
                boxShadow: isSelected
                  ? "0 0 14px rgba(0,255,255,0.65)"
                  : "0 0 0px rgba(0,255,255,0)",
              }
            : undefined
        }
        whileHover={
          onCoverFile && !isNew
            ? { boxShadow: "0 0 14px rgba(0,255,255,0.65)" }
            : undefined
        }
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={game ? `${game.title} cover` : "New game cover preview"}
            className="w-full h-full object-cover rounded-[8px]"
          />
        ) : (
          <span className="text-sm text-center px-2">
            {isNew && <PlusIcon size={32} />}
          </span>
        )}
      </motion.div>
      <span className="w-32 text-xs text-left truncate">
        {(isNew || isSelected) && previews.title
          ? previews.title
          : (game?.title ?? "New Game")}
      </span>
    </motion.div>
  );

  // If any actions were passed, wrap the card in a context menu
  if (!isNew && (onEdit || onDelete)) {
    return (
      <ContextMenu>
        <ContextMenuTrigger>{card}</ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <FileTextIcon />
              Edit
            </ContextMenuItem>
          )}
          {onDelete && (
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <DeleteIcon />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return card;
}
