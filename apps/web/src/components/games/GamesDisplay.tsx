/**
 * @name GamesDisplay
 * @description Main component for displaying the main content for the Games feature.
 * Shows the games carousel, the details of the selected game,
 * @author Zenko
 */
import { useCallback, useRef, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DeleteConfirmDialog } from "@/components/elements/DeleteConfirmDialog";
import { GameCarousel } from "./GameCarousel";
import { GameDetails } from "./GameDetails";
import { GameEditForm } from "./GameEditForm";
import { GameStateProvider } from "./GameStateCtx";
import {
  useDeleteGameMutation,
  useGamesQuery,
  type Game,
} from "@/hooks/queries/games";

type Previews = {
  cover: string | null;
  hero: string | null;
  title: string | null;
};

export function GamesDisplay({
  selectedGame,
  onGameSelect,
  isEditing,
  onStopEditing,
  onStartEditing,
  onEditGame,
  isCreating,
  onStopCreating,
  currentUserNanoid,
  search,
}: {
  selectedGame: Game | null;
  onGameSelect: (game: Game | null) => void;
  isEditing: boolean;
  onStopEditing: () => void;
  onStartEditing?: () => void;
  onEditGame?: (game: Game) => void;
  isCreating: boolean;
  onStopCreating: () => void;
  currentUserNanoid?: string;
  search?: string;
}) {
  const { data: games = [], isLoading: loading } = useGamesQuery({ search });
  const deleteMutation = useDeleteGameMutation();

  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [previews, setPreviews] = useState<Previews>({
    cover: null,
    hero: null,
    title: null,
  });

  const formRef = useRef<{ setCoverFile: (file: File | null) => void }>(null);

  const setPreview = useCallback((patch: Partial<Previews>) => {
    setPreviews((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearPreviews = useCallback(() => {
    setPreviews({ cover: null, hero: null, title: null });
  }, []);

  const handleGameSaved = (updated: Game) => {
    onGameSelect(updated);
    clearPreviews();
    onStopEditing();
  };

  const handleGameCreated = (newGame: Game) => {
    onGameSelect(newGame);
    clearPreviews();
    onStopCreating();
  };

  const handleGameSelect = (game: Game) =>
    onGameSelect(selectedGame?.nanoid === game.nanoid ? null : game);

  const handleEditFromMenu = (game: Game) =>
    onEditGame ? onEditGame(game) : (onGameSelect(game), onStartEditing?.());

  const handleDeleteConfirm = () => {
    if (!deletingGame?.nanoid) return;
    deleteMutation.mutate(deletingGame.nanoid, {
      onSuccess: () => {
        if (selectedGame?.nanoid === deletingGame.nanoid) onGameSelect(null);
        setDeletingGame(null);
      },
    });
  };

  const ctxValue = useMemo(
    () => ({ selectedGame, previews, isCreating, isEditing }),
    [selectedGame, previews, isCreating, isEditing],
  );

  const onCoverChange = useCallback(
    (cover: string | null) => setPreview({ cover }),
    [setPreview],
  );
  const onHeroChange = useCallback(
    (hero: string | null) => setPreview({ hero }),
    [setPreview],
  );
  const onTitleChange = useCallback(
    (title: string) => setPreview({ title }),
    [setPreview],
  );

  const sharedFormProps = {
    ref: formRef,
    onCoverChange,
    onHeroChange,
    onTitleChange,
  };

  return (
    <GameStateProvider value={ctxValue}>
      <div>
        <GameCarousel
          games={games}
          loading={loading}
          onCoverFile={(file) => formRef.current?.setCoverFile(file)}
          onGameSelect={handleGameSelect}
          onGameEdit={onEditGame ? handleEditFromMenu : undefined}
          onGameDelete={onEditGame ? setDeletingGame : undefined}
          currentUserNanoid={currentUserNanoid}
        />
        <AnimatePresence mode="wait">
          {(isCreating || selectedGame) && (
            <motion.div
              key={
                isCreating
                  ? "new"
                  : `${selectedGame!.nanoid}-${isEditing ? "edit" : "view"}`
              }
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {isCreating ? (
                <GameEditForm
                  {...sharedFormProps}
                  mode="create"
                  onSave={handleGameCreated}
                  onCancel={() => {
                    clearPreviews();
                    onStopCreating();
                  }}
                />
              ) : isEditing ? (
                <GameEditForm
                  {...sharedFormProps}
                  game={selectedGame!}
                  onSave={handleGameSaved}
                  onCancel={() => {
                    clearPreviews();
                    onStopEditing();
                  }}
                />
              ) : (
                <GameDetails game={selectedGame!} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DeleteConfirmDialog
          open={!!deletingGame}
          onOpenChange={(open) => {
            if (!open) setDeletingGame(null);
          }}
          title={`Delete "${deletingGame?.title}"?`}
          description="This will permanently remove the game and cannot be undone."
          isPending={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </GameStateProvider>
  );
}
