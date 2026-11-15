"use client";

import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { pickImages } from "@/app/lib/services/imagePicker";

export const ThumbnailStep = () => {
  const { thumbnailPath, setThumbnailPath } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function selectThumbnail() {
    try {
      const [selected] = await pickImages(false);
      if (selected) setThumbnailPath(selected);
    } catch (error) {
      window.alert(`Không thể chọn hình ảnh: ${String(error)}`);
    }
  }

  function handleCapture() {
    router.push(`/camera?${searchParams.toString()}&from=${encodeURIComponent(pathname)}&step=thumbnail`);
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Hình đại diện ghi chú</h2>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button type="button" className="btn btn-accent flex-1" onClick={selectThumbnail}>
            Chọn từ thiết bị
          </button>
          <button type="button" className="btn btn-secondary flex-1" onClick={handleCapture}>
            Chụp ảnh
          </button>
        </div>
        {thumbnailPath && (
          <div className="mt-2 flex flex-col items-center gap-2">
            <img
              src={convertFileSrc(thumbnailPath)}
              alt="Ảnh xem trước"
              className="h-48 w-full rounded-box object-cover"
            />
            <p className="break-all text-xs opacity-60">
              {thumbnailPath.split(/[\\/]/).pop()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
