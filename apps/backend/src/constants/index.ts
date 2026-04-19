import type { Features } from "#core/storage";
import { resolve } from "path";

export const dirStruct = {
  root: resolve("data"),
  uploads: resolve("data/uploads"),
  queueDb: resolve("data/queueData"),
};

export const baseUploadsFolders = new Set<Features | "temp">([
  "temp",
  "posts",
  "games",
  "users",
  "videos",
]);