"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ConfirmStepProps { diaryId: string | null }

export const ConfirmStep = ({ diaryId }: ConfirmStepProps) => {
  const { leafPaths, thumbnailPath, thought } = useNoteCreation();
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Xác nhận ghi chú</h2>
      <div className="stats stats-vertical w-full bg-base-200">
        <div className="stat">
          <div className="stat-title">Hình đại diện</div>
          <div className="stat-value text-sm truncate max-w-xs">{thumbnailPath ? thumbnailPath.split(/[\\/]/).pop() : "Chưa chọn"}</div>
          {thumbnailPath && <img src={convertFileSrc(thumbnailPath)} alt="Ảnh ghi chú" className="mt-2 w-20 h-20 object-cover rounded-box" />}
        </div>
        <div className="stat"><div className="stat-title">Số lượng hình lá</div><div className="stat-value text-lg">{leafPaths.length} hình</div></div>
        <div className="stat"><div className="stat-title">Suy nghĩ hôm nay</div><div className="stat-desc whitespace-pre-wrap">{thought.trim() || "Chưa ghi suy nghĩ"}</div></div>
        {diaryId && <div className="stat"><div className="stat-title">Mã nhật ký</div><div className="stat-desc font-mono">{diaryId}</div></div>}
      </div>
    </div>
  );
};
