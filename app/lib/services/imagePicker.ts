import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";

const IMAGE_DIRECTORY = "selected-images";
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

/**
 * Opens the platform's standard image chooser and persists the selected files
 * inside the app's data directory. Using an HTML file input allows Android and
 * iOS webviews to open their native photo/file chooser, unlike the desktop-only
 * Tauri dialog plugin.
 */
export async function pickImages(multiple: boolean): Promise<string[]> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.multiple = multiple;
  input.style.display = "none";
  document.body.appendChild(input);

  const files = await new Promise<File[]>((resolve) => {
    const finish = (selected: File[]) => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
      input.remove();
      resolve(selected);
    };
    const handleChange = () => finish(Array.from(input.files ?? []));
    const handleCancel = () => finish([]);

    input.addEventListener("change", handleChange, { once: true });
    input.addEventListener("cancel", handleCancel, { once: true });
    input.click();
  });

  if (files.length === 0) return [];

  const directory = await join(await appDataDir(), IMAGE_DIRECTORY);
  await mkdir(directory, { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
        throw new Error(`Định dạng ảnh không được hỗ trợ: ${file.name}`);
      }

      const destination = await join(directory, `${crypto.randomUUID()}.${extension}`);
      await writeFile(destination, new Uint8Array(await file.arrayBuffer()));
      return destination;
    }),
  );
}
