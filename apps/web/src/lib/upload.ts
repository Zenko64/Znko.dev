import axios from "axios";
import { ROUTES } from "@znko/consts";

/**
 * Uploads a single file to the staging endpoint.
 * Returns the temp filename (e.g. "abc123.mp4") to be submitted with the resource form.
 */
export async function stageFile(
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await axios.request<{ id: string }>({
    method: "post",
    url: ROUTES.uploads,
    data: file,
    withCredentials: true,
    headers: { "Content-Type": file.type },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
    signal: signal,
  });
  return res.data.id;
}
