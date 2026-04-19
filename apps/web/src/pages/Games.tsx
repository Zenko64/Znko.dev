import { GamesDisplay } from "@/components/games";
import { Activity } from "@/components/pages/Discord";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileTextIcon, GamepadIcon, PlusIcon, WifiIcon } from "raster-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useGamesQuery, type Game } from "@/hooks/queries/games";
import { useUrlState } from "@/hooks/useUrlState";
import { EmptyState } from "@/components/elements/EmptyState";
import { SearchBar } from "@/components/elements/SearchBar";

export function Games() {
  const [tab, setTab] = useState("games");
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const { data: games } = useGamesQuery({ search });
  const { setUrlItem } = useUrlState(games, setSelectedGame, (game) =>
    game ? `/games/${game.slug}?id=${game.nanoid}` : "/games",
  );

  const { user } = useAuth();

  const handleStartCreating = (v: boolean) => {
    setIsEditing(false);
    setSelectedGame(null);
    setIsCreating(v);
  };

  const handleGameSelect = (game: Game | null) => {
    if (isCreating) return;
    setSelectedGame(game);
    setUrlItem(game);

    // Reset edit mode whenever selection changes (deselect or switch to different game)
    if (!game || game.slug !== selectedGame?.slug) setIsEditing(false);
  };

  const handleEditGame = (game: Game) => {
    setIsCreating(false);
    setSelectedGame(game);
    setIsEditing(true);
  };

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="relative w-full h-[calc(100vh-var(--navbar-height)-52px)]"
    >
      <div className="absolute z-10 top-4 left-4 right-4 flex items-center justify-between gap-2">
        <TabsList className="bg-background/70 backdrop-blur-xs rounded-md border">
          <TabsTrigger value="games">
            <GamepadIcon className="size-6" />
          </TabsTrigger>
          <TabsTrigger value="presence">
            <WifiIcon className="size-6" />
          </TabsTrigger>
        </TabsList>
        {tab === "games" && (
          <div className="flex-1 max-w-sm">
            <SearchBar placeholder="Search games..." onSearch={setSearch} />
          </div>
        )}
        <AnimatePresence>
          {tab === "games" && user && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.97 }}
              className="flex flex-row gap-2"
            >
              <Button
                variant={isCreating ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  handleStartCreating(!isCreating);
                  setIsEditing(false);
                }}
              >
                <PlusIcon />
              </Button>
              <AnimatePresence>
                {selectedGame?.user?.nanoid === user?.nanoid && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      variant={isEditing ? "default" : "outline"}
                      size="icon"
                      onClick={() => {
                        setIsEditing((v) => !v);
                        setIsCreating(false);
                      }}
                    >
                      <FileTextIcon />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {(games && games.length !== 0) || isCreating ? (
        <div className="pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "games" ? (
                <GamesDisplay
                  selectedGame={selectedGame}
                  onGameSelect={handleGameSelect}
                  isEditing={isEditing}
                  onStopEditing={() => setIsEditing(false)}
                  onStartEditing={
                    selectedGame?.user?.nanoid === user?.nanoid
                      ? () => setIsEditing(true)
                      : undefined
                  }
                  onEditGame={user ? handleEditGame : undefined}
                  isCreating={isCreating}
                  onStopCreating={() => setIsCreating(false)}
                  currentUserNanoid={user?.nanoid}
                  search={search}
                />
              ) : (
                <Activity />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={<GamepadIcon className="size-6" />}
          title={search ? "No results found." : "No Games Yet."}
          description={
            search ? (
              <>No games match &ldquo;{search}&rdquo;.</>
            ) : (
              "No games have been created yet. You can be the first to create one!"
            )
          }
          action={
            !search &&
            user && (
              <Button onClick={() => handleStartCreating(true)}>
                Create New Game
              </Button>
            )
          }
        />
      )}
    </Tabs>
  );
}
