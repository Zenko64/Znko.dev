import z from "zod";

export const processingStatus = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
] as const);

export const videoTranscodeStatus = z.object({
  status: processingStatus,
  percent: z.number().optional(),
  message: z.string().optional(),
});
