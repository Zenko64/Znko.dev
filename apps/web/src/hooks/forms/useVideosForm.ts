// AI
import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateVideoMutation,
  useUploadVideoMutation,
  type Video,
} from "../queries/videos";
import { stageFile } from "@/lib/upload";
import { shapes } from "@znko/types";

const videoFormSchema = shapes.api.request.video.extend({
  video: z
    .instanceof(File, { message: "The video file is required." })
    .optional(),
  thumbnail: z
    .instanceof(File, { message: "The thumbnail file is required." })
    .optional(),
  tags: z.string().optional(), // Comma-separated tags for form input; will be split in submit handler
});

export type VideoFields = z.infer<typeof videoFormSchema>;

export function useVideosForm(existingVideo?: Video) {
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(
    undefined,
  );
  const uploadMutation = useUploadVideoMutation();
  const updateMutation = useUpdateVideoMutation();

  const form = useForm<VideoFields>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: existingVideo?.title ?? "",
      tags: (existingVideo?.tags ?? []).join(", "),
      description: existingVideo?.description ?? "",
      gameNanoid: existingVideo?.game?.nanoid ?? undefined,
      public: existingVideo?.public ?? false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submit = async (values: VideoFields, onSuccess: () => void) => {
    setUploadProgress(0); // Average progress of both uploads
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    if (!existingVideo) {
      if (!values.video) throw new Error("Video file is required.");
      if (!values.thumbnail) throw new Error("Thumbnail is required.");

      let videoProgress = 0;
      let thumbProgress = 0;

      const [stagedVideo, stagedThumbnail] = await Promise.all([
        stageFile(values.video, (pct) => {
          videoProgress = pct;
          setUploadProgress(Math.round((videoProgress + thumbProgress) / 2));
        }),
        stageFile(values.thumbnail, (pct) => {
          thumbProgress = pct;
          setUploadProgress(Math.round((videoProgress + thumbProgress) / 2));
        }),
      ]);

      uploadMutation.mutate(
        {
          title: values.title,
          description: values.description,
          tags,
          public: values.public,
          gameNanoid: values.gameNanoid,
          video: stagedVideo,
          thumbnail: stagedThumbnail,
        },
        {
          onSuccess: () => { setUploadProgress(undefined); onSuccess(); },
          onError: () => setUploadProgress(undefined),
        },
      );
    } else {
      updateMutation.mutate(
        {
          data: {
            title: values.title,
            description: values.description,
            tags,
            public: values.public,
            gameNanoid: values.gameNanoid,
          },
          nanoid: existingVideo.nanoid,
        },
        { onSuccess },
      );
    }
  };

  return {
    form,
    submit,
    isPending:
      uploadProgress !== undefined || uploadMutation.isPending || updateMutation.isPending,
    uploadProgress,
  };
}
