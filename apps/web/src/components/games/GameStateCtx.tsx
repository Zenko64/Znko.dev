/**
 * @name GameStateCtx
 * @description Context for managing the state of the Games feature. For both the list and the form.
 * @author Zenko
 */
import { createContext, useContext } from "react";
import type { Game } from "@/hooks/queries/games";

type GameStateCtxValue = {
  selectedGame: Game | null;
  previews: {
    cover?: string | null;
    hero?: string | null;
    title?: string | null;
  };
  isCreating: boolean;
  isEditing: boolean;
};

const GameStateCtx = createContext<GameStateCtxValue>({
  selectedGame: null,
  previews: {},
  isCreating: false,
  isEditing: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useGameState = () => useContext(GameStateCtx);
export const GameStateProvider = GameStateCtx.Provider;
