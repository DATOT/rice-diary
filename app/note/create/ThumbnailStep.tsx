"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

interface ThumbnailStepProps {
  setError: (err: string | null) => void;
  error: string | null;
}

export const ThumbnailStep = ({ setError, error }: ThumbnailStepProps) => {
  const { thumbnailPath, setThumbnailPath } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function selectThumbnail() {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setThumbnailPath(selected);
        setError(null);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  function handleCapture() {
    // Switch to /camera path with params to remember context/return
    const currentQuery = searchParams.toString();
    router.push(`/camera?${currentQuery}&from=${pathname}&step=thumbnail`);
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Hình đại diện</h2>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-accent flex-1"
            onClick={selectThumbnail}
          >
            Chọn từ thiết bị
          </button>
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={handleCapture}
          >
            Chụp ảnh (Camera)
          </button>
        </div>

        {thumbnailPath && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="w-full h-48 rounded-box overflow-hidden bg-base-300 relative">
              <img
                src={convertFileSrc(thumbnailPath)}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs opacity-60 break-all">
              {thumbnailPath.split(/[\\/]/).pop()}
            </p>
          </div>
        )}

        {error && <div className="alert alert-error text-sm">{error}</div>}
      </div>
    </div>
  );
};
