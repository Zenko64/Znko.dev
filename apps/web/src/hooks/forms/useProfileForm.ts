import { stageFile } from "@/lib/upload";
import { zodResolver } from "@hookform/resolvers/zod";
import { shapes } from "@znko/types";
import { useForm } from "react-hook-form";
import z from "zod";
import { useProfileUpdateMutation } from "../queries/profiles";

const profileSchema = shapes.api.request.profile.extend({
  avatar: z
    .instanceof(File, { message: "The avatar must be a file." })
    .optional()
    .nullable(),
});

export function useProfileForm(existingProfile: z.infer<typeof profileSchema>) {
  const mutation = useProfileUpdateMutation();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: existingProfile.displayName,
      username: existingProfile.username,
      avatar: existingProfile.avatar,
      description: existingProfile.description,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const submit = async (
    newData: z.infer<typeof profileSchema>,
    extras: { onSuccess?: () => void },
  ) => {
    const stagedAvatar =
      newData.avatar instanceof File
        ? await stageFile(newData.avatar)
        : newData.avatar === null
          ? null
          : undefined; // Distinguish between "no change" (undefined) and "remove avatar" (null)

    mutation.mutate(
      { ...newData, avatar: stagedAvatar },
      { onSuccess: extras.onSuccess },
    );
  };

  return { form, submit, isPending: mutation.isPending };
}
