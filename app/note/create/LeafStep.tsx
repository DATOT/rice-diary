"use client";

import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { pickImages } from "@/app/lib/services/imagePicker";

export const LeafStep = () => {
  const { leafPaths, setLeafPaths } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function selectLeaves() {
    try {
      const selected = await pickImages(true);
      if (selected.length > 0) setLeafPaths([...leafPaths, ...selected]);
    } catch (error) {
      window.alert(`Không thể chọn hình ảnh: ${String(error)}`);
    }
  }

  function handleCapture() {
    const query = searchParams.toString();
    router.push(`/camera?${query}&from=${encodeURIComponent(pathname)}&step=leaf`);
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Hình lá</h2>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button type="button" className="btn btn-accent flex-1" onClick={selectLeaves}>
            Chọn hình ảnh
          </button>
          <button type="button" className="btn btn-secondary flex-1" onClick={handleCapture}>
            Chụp ảnh
          </button>
        </div>
        {leafPaths.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {leafPaths.map((path, idx) => (
              <div
                key={`${path}-${idx}`}
                className="group relative h-32 overflow-hidden rounded-box bg-base-300"
              >
                <img
                  src={convertFileSrc(path)}
                  alt={`Ảnh lá ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Xóa hình"
                  className="btn btn-circle btn-error btn-xs absolute right-1 top-1"
                  onClick={() => setLeafPaths(leafPaths.filter((_, index) => idx !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
