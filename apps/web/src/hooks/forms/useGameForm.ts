// AI
import { useForm } from "react-hook-form";
import {
  useCreateGameMutation,
  useUpdateGameMutation,
} from "@/hooks/queries/games";
import type { Game } from "@/hooks/queries/games";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { stageFile } from "@/lib/upload";
import { shapes } from "@znko/types";

const gameSchemaBase = shapes.api.request.game.extend({
  hero: z.instanceof(File).nullish(),
  tags: z.string(),
});

const gameSchemaCreate = gameSchemaBase.extend({
  cover: z.instanceof(File, { message: "The cover image is required." }),
});

const gameSchemaEdit = gameSchemaBase.extend({
  cover: z.instanceof(File).optional(),
});

type GameFormValues = z.infer<typeof gameSchemaEdit>;

export function useGameForm(existingGame?: Game) {
  const createMutation = useCreateGameMutation();
  const updateMutation = useUpdateGameMutation();

  const schema = existingGame ? gameSchemaEdit : gameSchemaCreate;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: existingGame?.title ?? "",
      tags: (existingGame?.tags ?? []).join(", "),
      public: existingGame?.public ?? false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submit = async (
    values: GameFormValues,
    extras: {
      description: string;
      existingMedia: Game["gameMedia"];
      newMediaFiles: File[];
      onSuccess: (saved: Game) => void;
    },
  ) => {
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Stage all files concurrently before submitting
    const [stagedCover, stagedHero, ...stagedMedia] = await Promise.all([
      values.cover instanceof File
        ? stageFile(values.cover)
        : Promise.resolve(undefined),
      values.hero instanceof File
        ? stageFile(values.hero)
        : Promise.resolve(undefined),
      ...extras.newMediaFiles.map((f) => stageFile(f)),
    ]);

    // null = explicit delete sentinel (only meaningful in update flow)
    const heroPayload: string | null | undefined =
      values.hero === null ? null : (stagedHero ?? undefined);

    if (!existingGame) {
      if (!stagedCover) throw new Error("Cover image is required.");
      createMutation.mutate(
        {
          title: values.title,
          description: extras.description,
          public: values.public,
          tags,
          cover: stagedCover,
          ...(stagedHero && { hero: stagedHero }),
          ...(stagedMedia.length > 0 && { media: stagedMedia as string[] }),
        },
        { onSuccess: extras.onSuccess },
      );
    } else {
      const keepUrls = (extras.existingMedia ?? []).map((m) => m.url);
      const media = [...keepUrls, ...(stagedMedia as string[])];
      updateMutation.mutate(
        {
          nanoid: existingGame.nanoid,
          data: {
            title: values.title,
            description: extras.description,
            public: values.public,
            tags,
            ...(stagedCover && { cover: stagedCover }),
            ...(heroPayload !== undefined && { hero: heroPayload }),
            ...(media.length > 0 && { media }),
          },
        },
        { onSuccess: extras.onSuccess },
      );
    }
  };

  return {
    form,
    submit,
    isPending: createMutation.isPending || updateMutation.isPending,
  };
}
