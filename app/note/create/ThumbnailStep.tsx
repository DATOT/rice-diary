"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export const ThumbnailStep = () => {
  const { thumbnailPath, setThumbnailPath } = useNoteCreation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  async function selectThumbnail() {
    try {
      const selected = await open({ multiple: false, directory: false, filters: [{ name: "Hình ảnh", extensions: ["png", "jpg", "jpeg", "webp"] }] });
      if (typeof selected === "string") setThumbnailPath(selected);
    } catch (error) { window.alert(`Không thể chọn hình ảnh: ${String(error)}`); }
  }
  function handleCapture() {
    router.push(`/camera?${searchParams.toString()}&from=${encodeURIComponent(pathname)}&step=thumbnail`);
  }
  return <div>
    <h2 className="text-xl font-bold mb-4">Hình đại diện ghi chú</h2>
    <div className="flex flex-col gap-4">
      <div className="flex gap-2"><button type="button" className="btn btn-accent flex-1" onClick={selectThumbnail}>Chọn từ thiết bị</button><button type="button" className="btn btn-secondary flex-1" onClick={handleCapture}>Chụp ảnh</button></div>
      {thumbnailPath && <div className="flex flex-col items-center gap-2 mt-2"><img src={convertFileSrc(thumbnailPath)} alt="Ảnh xem trước" className="w-full h-48 rounded-box object-cover" /><p className="text-xs opacity-60 break-all">{thumbnailPath.split(/[\\/]/).pop()}</p></div>}
    </div>
  </div>;
};
