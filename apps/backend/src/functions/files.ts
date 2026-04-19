import logger from "#core/logging";
import pathOps from "#functions/paths";
import { stat, unlink } from "fs/promises";

async function unlinkFileByUrl(url: string): Promise<void> {
  const filePath = pathOps.fsPathFromUrl(url);
  if (!filePath) return;

  try {
    const obj = await stat(filePath);
    if (obj.isFile() && filePath.split(/[\\/]/).length >= 4) {
      await unlink(filePath);
    }
  } catch (error) {
    logger.warn("An error has occurred while deleting an uploaded file.", {
      fileUrl: url,
      error,
    });
  }
}

async function cleanupFiles(urls: string[]): Promise<void> {
  if (!urls.length) return;
  await Promise.all(urls.map(unlinkFileByUrl));
}

export default {
  unlinkFileByUrl,
  cleanupFiles,
};
