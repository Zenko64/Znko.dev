import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreatePostMutation, useUpdatePostMutation } from "../queries/posts";
import type { Post } from "@/hooks/queries/posts";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { stageFile } from "@/lib/upload";
import { shapes } from "@znko/types";

const post = shapes.api.request.post
  .omit({ media: true })
  .extend({ media: z.array(z.instanceof(File)).optional().default([]) });

export function usePostsForm(existingPost?: Post) {
  const createMutation = useCreatePostMutation();
  const updateMutation = useUpdatePostMutation();
  const [isStaging, setIsStaging] = useState(false);

  const form = useForm({
    resolver: zodResolver(post),
    defaultValues: {
      content: existingPost?.content ?? "",
      public: existingPost?.public ?? false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submit = async (
    values: z.infer<typeof post>,
    extras: {
      onSuccess: () => void;
      existingMedia?: Post["postMedia"];
      newMediaFiles?: File[];
    },
  ) => {
    const filesToStage = extras.newMediaFiles ?? values.media ?? [];
    setIsStaging(true);
    const stagedNewMedia = await Promise.all(filesToStage.map((f) => stageFile(f))).finally(() => setIsStaging(false));

    const keepUrls = (extras.existingMedia ?? []).map((m) => m.url);
    const media = [...keepUrls, ...stagedNewMedia];

    const payload = {
      content: values.content,
      public: values.public,
      ...(media.length > 0 && { media }),
    };

    if (!existingPost) {
      createMutation.mutate(payload, { onSuccess: extras.onSuccess });
    } else {
      updateMutation.mutate(
        { body: payload, nanoid: existingPost.nanoid },
        { onSuccess: extras.onSuccess },
      );
    }
  };

  return {
    form,
    submit,
    isPending: isStaging || createMutation.isPending || updateMutation.isPending,
  };
}
