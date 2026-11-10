"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

interface LeafStepProps {
  setError: (err: string | null) => void;
  error: string | null;
}

export const LeafStep = ({ setError, error }: LeafStepProps) => {
  const { leafPaths, setLeafPaths } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function selectLeaves() {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (selected) {
        const newPaths = Array.isArray(selected) ? selected : [selected];
        setLeafPaths([...leafPaths, ...newPaths]);
        setError(null);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  function handleCapture() {
    const currentQuery = searchParams.toString();
    router.push(`/camera?${currentQuery}&from=${pathname}&step=leaf`);
  }

  function handleRemove(indexToRemove: number) {
    setLeafPaths(leafPaths.filter((_, idx) => idx !== indexToRemove));
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Hình lá</h2>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-accent flex-1"
            onClick={selectLeaves}
          >
            Chọn nhiều hình ảnh
          </button>
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={handleCapture}
          >
            Chụp ảnh (Camera)
          </button>
        </div>

        {leafPaths.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
            {leafPaths.map((path, idx) => (
              <div
                key={idx}
                className="relative rounded-box overflow-hidden bg-base-300 h-32 group"
              >
                <img
                  src={convertFileSrc(path)}
                  alt={`Leaf ${idx}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 btn btn-circle btn-xs btn-error opacity-80 group-hover:opacity-100"
                  onClick={() => handleRemove(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error text-sm">{error}</div>}
      </div>
    </div>
  );
};
