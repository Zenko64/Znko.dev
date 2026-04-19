// Base components — accept className for layout flexibility
export { MediaSlide } from "./MediaSlide";
export { MediaCarousel } from "./MediaCarousel";
export { GameCard } from "./GameCard";
export { GameBanner } from "./GameBanner";

// Composed layout components — complete, self-contained layouts
export { GameCarousel } from "./GameCarousel";
export { GameDetails } from "./GameDetails";
export { GameEditForm } from "./GameEditForm";
export { GamesDisplay } from "./GamesDisplay";

export type { Game, GameMedia } from "@/hooks/queries/games";
