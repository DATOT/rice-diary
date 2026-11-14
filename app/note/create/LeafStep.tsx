"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export const LeafStep = () => {
  const { leafPaths, setLeafPaths } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  async function selectLeaves() {
    try {
      const selected = await open({ multiple: true, directory: false, filters: [{ name: "Hình ảnh", extensions: ["png", "jpg", "jpeg", "webp"] }] });
      if (selected) setLeafPaths([...leafPaths, ...(Array.isArray(selected) ? selected : [selected])]);
    } catch (error) { window.alert(`Không thể chọn hình ảnh: ${String(error)}`); }
  }
  function handleCapture() {
    const query = searchParams.toString();
    router.push(`/camera?${query}&from=${encodeURIComponent(pathname)}&step=leaf`);
  }
  return <div>
    <h2 className="text-xl font-bold mb-4">Hình lá</h2>
    <div className="flex flex-col gap-4">
      <div className="flex gap-2"><button type="button" className="btn btn-accent flex-1" onClick={selectLeaves}>Chọn hình ảnh</button><button type="button" className="btn btn-secondary flex-1" onClick={handleCapture}>Chụp ảnh</button></div>
      {leafPaths.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">{leafPaths.map((path, idx) => <div key={`${path}-${idx}`} className="relative rounded-box overflow-hidden bg-base-300 h-32 group"><img src={convertFileSrc(path)} alt={`Ảnh lá ${idx + 1}`} className="w-full h-full object-cover" /><button type="button" aria-label="Xóa hình" className="absolute top-1 right-1 btn btn-circle btn-xs btn-error" onClick={() => setLeafPaths(leafPaths.filter((_, index) => idx !== index))}>✕</button></div>)}</div>}
    </div>
  </div>;
};
