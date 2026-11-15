"use client";

import Link from "next/link";
import { FaBars } from "react-icons/fa";
import StreakBadge from "@/app/components/StreakBadge";
import { type DiarySummary } from "@/app/lib/services/database";
import { getDiaryThumbnailSrc } from "@/app/lib/services/diaryFiles";
import { getToday } from "@/app/lib/utils";

interface DiaryCardProps {
  diary: DiarySummary;
  onDelete: (diary: DiarySummary) => void;
}

export default function DiaryCard({ diary, onDelete }: DiaryCardProps) {
  return (
    <div className="card w-[90%] overflow-hidden border border-base-300 bg-base-200 shadow-sm shadow-base-300/40">
      <figure className="relative w-full">
        <img
          src={getDiaryThumbnailSrc(diary.thumbnail_path)}
          alt={diary.diary_name}
          className="h-48 w-full object-cover"
        />
      </figure>

      <div className="card-body flex flex-col p-4">
        <StreakBadge
          onStreak={diary.last_active_date >= getToday()}
          streak={diary.current_streak}
          className="absolute right-3 top-3 z-10"
        />

        <h2 className="card-title text-base text-base-content">{diary.diary_name}</h2>

        <div className="space-y-1 text-sm text-base-content/70">
          <p>Chuỗi hiện tại: {diary.current_streak} ngày</p>
          <p>Kỷ lục: {diary.longest_streak} ngày</p>
        </div>

        <div className="card-actions mt-auto flex w-full items-center gap-2 pt-2">
          <Link
            className="btn btn-primary flex-1"
            href={`/diary?id=${encodeURIComponent(diary.id)}`}
          >
            Xem nhật ký
          </Link>

          <details className="dropdown dropdown-top dropdown-end ml-auto">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content transition hover:bg-base-200">
              <FaBars size="14pt" />
            </summary>

            <ul className="menu dropdown-content z-20 w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
              <li>
                <Link href={`/diary/settings?id=${encodeURIComponent(diary.id)}`}>
                  Chỉnh sửa
                </Link>
              </li>
              <li>
                <button className="text-error" onClick={() => onDelete(diary)}>
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
