"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ConfirmStepProps {
  diaryId: string | null;
}

export const ConfirmStep = ({ diaryId }: ConfirmStepProps) => {
  const { leafPaths, thumbnailPath } = useNoteCreation();
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Xác nhận</h2>
      <div className="flex flex-col gap-4">
        <div className="stats stats-vertical w-full bg-base-200">
          <div className="stat">
            <div className="stat-title">Hình đại diện</div>
            <div className="stat-value text-sm truncate max-w-xs">
              {thumbnailPath ? thumbnailPath.split(/[\\/]/).pop() : "Chưa chọn"}
            </div>
            {thumbnailPath && (
              <div className="mt-2">
                <img
                  src={convertFileSrc(thumbnailPath)}
                  alt="Avatar"
                  className="w-20 h-20 object-cover rounded-box"
                />
              </div>
            )}
          </div>

          <div className="stat">
            <div className="stat-title">Số lượng hình lá</div>
            <div className="stat-value text-lg">{leafPaths.length} hình</div>
          </div>

          {diaryId && (
            <div className="stat">
              <div className="stat-title">Mã Nhật Ký (Diary ID)</div>
              <div className="stat-desc font-mono">{diaryId}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
