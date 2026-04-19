import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";
import type { Game } from "../games";

/**
 * A combobox for selecting a game from a list, with cover art and search filtering.
 * @param games - List of games to display.
 * @param value - The currently selected game nanoid, or `null` for no selection.
 * @param onValueChange - Called with the selected game nanoid, or `null` when cleared.
 */
export function GameCombobox({
  games,
  value,
  onValueChange,
}: {
  games: Game[];
  value: string | null;
  onValueChange: (value: string | null) => void;
}) {
  // Resolve the controlled nanoid back to the full Game object so base-ui can
  // pull the title for the input display via itemToStringLabel.
  const selected = games.find((g) => g.nanoid === value) ?? null;

  return (
    games.length > 0 && (
      <Combobox
        items={games}
        itemToStringLabel={(g: Game) => g.title}
        itemToStringValue={(g: Game) => g.nanoid}
        value={selected}
        onValueChange={(item: Game | null) =>
          onValueChange(item?.nanoid ?? null)
        }
      >
        <ComboboxInput placeholder="Select a game" />
        <ComboboxContent>
          <ComboboxEmpty>No games found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxItem value={null} className="h-12 text-md">
              None
            </ComboboxItem>
            {games.map((game) => (
              <ComboboxItem
                key={game.slug}
                value={game}
                className="flex flex-row h-20 text-md gap-4"
              >
                {game.coverImgUrl && (
                  <span className="h-full aspect-square shrink-0 overflow-hidden rounded">
                    <img
                      src={game.coverImgUrl}
                      alt={`${game.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  </span>
                )}
                {game.title}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  );
}
