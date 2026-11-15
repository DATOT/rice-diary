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
    <article className="card w-full overflow-hidden border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
      <figure className="relative w-full bg-base-300">
        <img
          src={getDiaryThumbnailSrc(diary.thumbnail_path)}
          alt={diary.diary_name}
          className="h-44 w-full object-cover sm:h-52"
        />
      </figure>

      <div className="card-body flex flex-col gap-3 p-4 sm:p-5">
        <StreakBadge
          onStreak={diary.last_active_date >= getToday()}
          streak={diary.current_streak}
          className="absolute right-3 top-3 z-10"
        />

        <h2 className="card-title break-words pr-2 text-base text-base-content sm:text-lg">
          {diary.diary_name}
        </h2>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/70">
          <p>Chuỗi hiện tại: {diary.current_streak} ngày</p>
          <p>Kỷ lục: {diary.longest_streak} ngày</p>
        </div>

        <div className="card-actions mt-auto flex w-full items-center gap-2 pt-1">
          <Link
            className="btn btn-primary min-h-12 flex-1"
            href={`/diary?id=${encodeURIComponent(diary.id)}`}
          >
            Xem nhật ký
          </Link>

          <details className="dropdown dropdown-top dropdown-end">
            <summary
              aria-label={`Tùy chọn nhật ký ${diary.diary_name}`}
              className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content transition-colors hover:bg-base-200"
            >
              <FaBars size={18} aria-hidden="true" />
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
    </article>
  );
}
