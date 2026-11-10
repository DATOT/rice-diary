"use client";

import Link from "next/link";
import { FaBars } from "react-icons/fa";
import StreakIcon from "@/app/components/StreakIcon";
import { type DiarySummary } from "@/app/lib/services/database";
import { getDiaryThumbnailSrc } from "@/app/lib/services/diaryFiles";
import StreakBadge from "@/app/components/StreakBadge";
import { getToday } from "@/app/lib/utils";

interface DiaryCardProps {
  diary: DiarySummary;
  onDelete: (diary: DiarySummary) => void;
}

export default function DiaryCard({ diary, onDelete }: DiaryCardProps) {
  return (
    <div className="card bg-base-300 image-full w-[90%]">
      <figure className="relative w-full">
        <img
          src={getDiaryThumbnailSrc(diary.thumbnail_path)}
          alt={diary.diary_name}
          className="w-full h-48 object-cover"
        />
      </figure>

      <div className="card-body p-4 flex flex-col">
        <StreakBadge
          onStreak={diary.last_active_date >= getToday()}
          streak={diary.current_streak}
          className="absolute top-3 right-3 z-10"
        />

        <h2 className="card-title text-base">{diary.diary_name}</h2>

        <div className="text-sm opacity-70">
          <p>Chuỗi hiện tại: {diary.current_streak} ngày</p>
          <p>Kỷ lục: {diary.longest_streak} ngày</p>
        </div>

        <div className="card-actions w-full mt-auto flex items-center">
          <Link
            className="btn btn-secondary p-2"
            href={`/diary?id=${encodeURIComponent(diary.id)}`}
          >
            Xem nhật ký
          </Link>

          <details className="ml-auto dropdown dropdown-top dropdown-end">
            <summary className="h-10 flex items-center cursor-pointer list-none">
              <FaBars size="20pt" className="border w-8 h-8 p-[1.5] rounded" />
            </summary>

            <ul className="menu dropdown-content bg-base-100 rounded-box z-10 min-w-max p-2 shadow-sm">
              <li>
                <Link
                  href={`/diary/settings?id=${encodeURIComponent(diary.id)}`}
                >
                  Chỉnh sửa
                </Link>
              </li>

              <li>
                <button
                  className="text-red-400"
                  onClick={() => onDelete(diary)}
                >
                  Xóa
                </button>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
