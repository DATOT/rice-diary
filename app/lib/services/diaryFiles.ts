import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { copyFile, mkdir, remove } from "@tauri-apps/plugin-fs";

const THUMBNAIL_DIR = "diary-thumbnails";

export async function saveDiaryThumbnail(sourcePath: string): Promise<string> {
  const directory = await join(await appDataDir(), THUMBNAIL_DIR);

  await mkdir(directory, { recursive: true });

  const extension = sourcePath.split(".").pop()?.toLowerCase();

  const allowedExtensions = ["png", "jpg", "jpeg", "webp"];

  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("Unsupported thumbnail format.");
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const destination = await join(directory, filename);

  await copyFile(sourcePath, destination);

  // Store the absolute path in SQLite.
  return destination;
}

export function getDiaryThumbnailSrc(path: string | null): string {
  if (!path) {
    return "/image.jfif";
  }

  return convertFileSrc(path);
}

export async function deleteDiaryThumbnail(path: string | null): Promise<void> {
  if (!path) return;

  try {
    await remove(path);
  } catch (error) {
    console.warn("Could not delete diary thumbnail:", error);
  }
}
