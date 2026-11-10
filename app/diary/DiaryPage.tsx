"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar } from "vanilla-calendar-pro";

import StreakCalendar from "./components/Diary/StreakCalendar";
import StreakCalendarInput from "./components/Diary/StreakCalendarInput";
import { convertFileSrc } from "@tauri-apps/api/core";

import {
  loadDiary,
  loadDiaryNotes,
  loadDiaryNoteDetails,
  type DiarySummary,
  type DiaryNote,
  type DiaryNoteDetails,
} from "@/app/lib/services/database";

interface Props {
  id: string;
}

// ------------------------------------
// Date utilities
// ------------------------------------

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function expandDateRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];

  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );

  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= last) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ------------------------------------
// Component
// ------------------------------------

const DiaryPage = ({ id }: Props) => {
  const calendarRef = useRef<Calendar | null>(null);

  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [notes, setNotes] = useState<DiaryNote[]>([]);

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [draftDates, setDraftDates] = useState<Date[]>([]);

  const [selectedNote, setSelectedNote] = useState<DiaryNoteDetails | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  // ------------------------------------
  // Load diary and notes
  // ------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError(null);

      try {
        const [diaryResult, notesResult] = await Promise.all([
          loadDiary(id),
          loadDiaryNotes(id),
        ]);

        if (cancelled) return;

        if (!diaryResult) {
          throw new Error("Không tìm thấy nhật ký.");
        }

        setDiary(diaryResult);
        setNotes(notesResult);

        // Start by selecting today.
        const initialDate = new Date();

        setSelectedDates([initialDate]);
        setDraftDates([initialDate]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không thể tải nhật ký.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ------------------------------------
  // Derived data
  // ------------------------------------

  const hasTodayNote = useMemo(
    () => notes.some((note) => note.local_date === todayKey),
    [notes, todayKey],
  );

  const streaks = useMemo(
    () => notes.map((note) => parseDateKey(note.local_date)),
    [notes],
  );

  const selectedNoteDates = useMemo(
    () => new Set(selectedDates.map(toDateKey)),
    [selectedDates],
  );

  const notesInRange = useMemo(
    () => notes.filter((note) => selectedNoteDates.has(note.local_date)),
    [notes, selectedNoteDates],
  );

  const isSingleDate = selectedDates.length === 1;

  const selectedDateLabel = useMemo(() => {
    if (selectedDates.length === 0) return "Chọn ngày";

    if (isSingleDate) {
      return formatDate(selectedDates[0]);
    }

    const first = selectedDates[0];
    const last = selectedDates[selectedDates.length - 1];

    return `${formatDate(first)} - ${formatDate(last)}`;
  }, [selectedDates, isSingleDate]);

  // ------------------------------------
  // Load selected note details
  // ------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedNote() {
      setSelectedNote(null);

      if (!isSingleDate) return;

      const dateKey = toDateKey(selectedDates[0]);

      const note = notes.find((item) => item.local_date === dateKey);

      if (!note) return;

      setNoteLoading(true);

      try {
        const details = await loadDiaryNoteDetails(note.id);

        if (!cancelled) {
          setSelectedNote(details);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải nội dung nhật ký.",
          );
        }
      } finally {
        if (!cancelled) setNoteLoading(false);
      }
    }

    loadSelectedNote();

    return () => {
      cancelled = true;
    };
  }, [selectedDates, notes, isSingleDate]);

  // ------------------------------------
  // Calendar selection
  // ------------------------------------

  const onChoosingDates = useCallback((self: Calendar) => {
    const selected = self.context.selectedDates;

    if (selected.length === 0) {
      setDraftDates([]);
      return;
    }

    const dates = selected.map((date) => parseDateKey(String(date)));

    if (dates.length === 1) {
      setDraftDates(dates);
      return;
    }

    const [first, second] = dates;

    const start = first <= second ? first : second;
    const end = first <= second ? second : first;

    setDraftDates(expandDateRange(start, end));
  }, []);

  // ------------------------------------
  // Select all dates
  // ------------------------------------

  const handleSelectAllDates = useCallback(() => {
    if (notes.length === 0) return;

    const sorted = [...notes].sort((a, b) =>
      a.local_date.localeCompare(b.local_date),
    );

    const start = sorted[0].local_date;
    const end = sorted[sorted.length - 1].local_date;

    calendarRef.current?.set(
      {
        selectedDates: [`${start}:${end}`],
      },
      {
        dates: true,
      },
    );

    setDraftDates(expandDateRange(parseDateKey(start), parseDateKey(end)));
  }, [notes]);

  // ------------------------------------
  // Apply / cancel selection
  // ------------------------------------

  const handleApplyDates = () => {
    setSelectedDates(draftDates);
    setDatePickerOpen(false);
  };

  const handleCancelDates = () => {
    setDraftDates(selectedDates);
    setDatePickerOpen(false);
  };

  const handleOpenDatePicker = () => {
    setDraftDates(selectedDates);
    setDatePickerOpen((previous) => !previous);
  };

  // ------------------------------------
  // Loading / errors
  // ------------------------------------

  if (loading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error && !diary) {
    return <div className="alert alert-error m-4">{error}</div>;
  }

  if (!diary) return null;

  // ------------------------------------
  // Render
  // ------------------------------------

  return (
    <main className="w-full p-4 flex flex-col gap-5 items-center">
      {/* Diary title */}
      <header className="w-full">
        <h1 className="text-2xl font-black">{diary.diary_name}</h1>

        <p className="text-sm opacity-60">
          Chuỗi hiện tại: {diary.current_streak} ngày
        </p>
      </header>

      {/* Create today's note */}
      {!hasTodayNote && (
        <section className="w-full">
          <Link
            href={`/note/create?diary_id=${encodeURIComponent(id)}`}
            className="btn btn-primary w-full"
          >
            <span className="text-lg">+</span>
            Cập nhật cho hôm nay
          </Link>
        </section>
      )}

      {/* Streak calendar */}
      <section className="w-full">
        <StreakCalendar
          createdAt={new Date(diary.created_at)}
          streaks={streaks}
        />
      </section>

      <div className="divider divider-start">
        <span className="font-semibold">Thống kê nhật ký</span>
      </div>

      {/* Date selection dropdown */}
      <section className="w-full relative">
        <button
          onClick={handleOpenDatePicker}
          className="btn btn-ghost border border-base-300 w-full justify-between"
        >
          <span>{selectedDateLabel}</span>

          <span className="text-xs opacity-60">
            {datePickerOpen ? "▲" : "▼"}
          </span>
        </button>

        {datePickerOpen && (
          <div className="absolute top-full left-0 mt-2 z-30 bg-base-100 border border-base-300 shadow-xl rounded-box p-4 w-full">
            <div className="flex justify-between items-center gap-2 mb-3">
              <h3 className="font-bold">Chọn khoảng thời gian</h3>

              <button
                className="btn btn-xs btn-ghost"
                onClick={handleSelectAllDates}
                disabled={notes.length === 0}
              >
                Chọn tất cả ngày
              </button>
            </div>

            <StreakCalendarInput
              createdAt={new Date(diary.created_at)}
              streaks={streaks}
              selectionMethod="multiple-ranged"
              onClickDate={onChoosingDates}
              calendarInstanceRef={calendarRef}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-sm" onClick={handleCancelDates}>
                Hủy
              </button>

              <button
                className="btn btn-sm btn-primary"
                onClick={handleApplyDates}
                disabled={draftDates.length === 0}
              >
                Chọn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Statistics */}
      <section className="w-full flex flex-col gap-4">
        {notesInRange.length === 0 ? (
          <div className="text-center opacity-60 p-8">
            <p className="font-semibold">
              Không có nhật ký trong khoảng thời gian này.
            </p>
          </div>
        ) : isSingleDate ? (
          // Single date
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">{selectedDateLabel}</h2>

            {noteLoading ? (
              <span className="loading loading-spinner loading-md" />
            ) : selectedNote ? (
              <>
                {selectedNote.thumbnail_path && (
                  <img
                    src={convertFileSrc(selectedNote.thumbnail_path)}
                    alt="Ảnh nhật ký"
                    className="w-full max-h-64 object-cover rounded-box"
                  />
                )}

                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Số lượng lá</div>

                    <div className="stat-value">
                      {selectedNote.leaves.length}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedNote.leaves.map((leaf) => (
                    <div key={leaf.id} className="card bg-base-200 p-3">
                      <img
                        src={convertFileSrc(leaf.file_path)}
                        alt="Ảnh lá"
                        className="w-full max-h-48 object-cover rounded"
                      />

                      <p className="mt-2 text-sm">
                        Thiếu hụt Nitrogen: {leaf.nitrogen_deficiency}%
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          // Multiple dates
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Tổng quan khoảng thời gian</h2>

            <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-title">Số ngày có nhật ký</div>

                <div className="stat-value">{notesInRange.length}</div>
              </div>

              <div className="stat">
                <div className="stat-title">Tổng số lá chụp</div>

                <div className="stat-value">—</div>
              </div>
            </div>

            <p className="text-sm opacity-60">
              Biểu đồ phân tích Nitrogen sẽ được hiển thị ở đây.
            </p>

            {/* Note navigation can go here later */}
            <div className="flex flex-col gap-2">
              {notesInRange.map((note) => (
                <button
                  key={note.id}
                  className="btn btn-ghost justify-between border border-base-300"
                  onClick={() => {
                    const date = parseDateKey(note.local_date);
                    setSelectedDates([date]);
                    setDraftDates([date]);
                  }}
                >
                  <span>{note.local_date}</span>
                  <span>Chi tiết →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="alert alert-error w-full">
          {error}
          <button className="btn btn-sm" onClick={() => setError(null)}>
            Đóng
          </button>
        </div>
      )}
    </main>
  );
};

export default DiaryPage;
