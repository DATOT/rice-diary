"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar } from "vanilla-calendar-pro";
import StreakCalendar from "./components/Diary/StreakCalendar";
import StreakCalendarInput from "./components/Diary/StreakCalendarInput";
import DiseaseOverlay from "./components/Diary/DiseaseOverlay";
import AdviceCards from "./components/Diary/AdviceCards";
import { NoteCharts, RangeCharts } from "./components/Diary/NoteCharts";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  analyzeNoteForDiseases,
  loadChartRows,
  loadDiseaseLeaves,
  loadDiseaseResults,
  parseDetection,
  type ChartRow,
  type DiseaseLeaf,
  type ParsedDetection,
} from "@/app/lib/services/insights";
import {
  loadDiary,
  loadDiaryNotes,
  loadDiaryNoteDetails,
  type DiarySummary,
  type DiaryNote,
  type DiaryNoteDetails,
} from "@/app/lib/services/database";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function expandDateRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
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

export default function DiaryPage({ id }: { id: string }) {
  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [draftDates, setDraftDates] = useState<Date[]>([]);
  const [selectedNote, setSelectedNote] = useState<DiaryNoteDetails | null>(null);
  const [detections, setDetections] = useState<ParsedDetection[]>([]);
  const [chartRows, setChartRows] = useState<ChartRow[]>([]);
  const [diseaseLeaves, setDiseaseLeaves] = useState<DiseaseLeaf[]>([]);
  const [noteLoading, setNoteLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const refreshInsights = useCallback(async () => {
    const [rows, leaves] = await Promise.all([
      loadChartRows(),
      loadDiseaseLeaves(id),
    ]);

    setChartRows(rows.filter((row) => row.diary_id === id));
    setDiseaseLeaves(leaves);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true); setError(null);
      try {
        const [diaryResult, notesResult] = await Promise.all([
          loadDiary(id),
          loadDiaryNotes(id),
        ]);

        if (cancelled) return;
        if (!diaryResult) throw new Error("Không tìm thấy nhật ký.");

        setDiary(diaryResult);
        setNotes(notesResult);

        const initialDate = new Date();
        setSelectedDates([initialDate]);
        setDraftDates([initialDate]);
        await refreshInsights();
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Không thể tải nhật ký.",
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
  }, [id, refreshInsights]);

  const hasTodayNote = useMemo(
    () => notes.some((note) => note.local_date === todayKey),
    [notes, todayKey],
  );
  const canCreateNote = Boolean(diary && !diary.is_dead);
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
  const rowsInRange = useMemo(
    () => chartRows.filter((row) => row.note_id && selectedNoteDates.has(row.local_date)),
    [chartRows, selectedNoteDates],
  );
  const diseaseLeavesInRange = useMemo(
    () => diseaseLeaves.filter((leaf) => selectedNoteDates.has(leaf.local_date)),
    [diseaseLeaves, selectedNoteDates],
  );
  const totalLeavesInRange = useMemo(
    () => rowsInRange.reduce((total, row) => total + row.leaf_count, 0),
    [rowsInRange],
  );
  const totalRegionsInRange = useMemo(
    () => diseaseLeavesInRange.reduce((total, leaf) => total + leaf.predictions.length, 0),
    [diseaseLeavesInRange],
  );
  const isSingleDate = selectedDates.length === 1;
  const selectedDateLabel = useMemo(() => {
    if (!selectedDates.length) return "Chọn ngày";
    if (isSingleDate) return formatDate(selectedDates[0]);
    return `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[selectedDates.length - 1])}`;
  }, [selectedDates, isSingleDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedNote() {
      setSelectedNote(null);
      setDetections([]);
      if (!isSingleDate) return;

      const note = notes.find((item) => item.local_date === toDateKey(selectedDates[0]));
      if (!note) return;

      try {
        const detail = await loadDiaryNoteDetails(note.id);
        if (cancelled || !detail) return;

        setSelectedNote(detail);
        const parsed = await parseDetection(note.id, detail.leaves);
        setDetections(parsed);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Không thể tải chi tiết ghi chú.",
          );
        }
      }
    }

    void loadSelectedNote();
    return () => {
      cancelled = true;
    };
  }, [isSingleDate, notes, selectedDates]);

  const activeDate = isSingleDate ? selectedDates[0] : null;

  async function handleSubmitNote() {
    if (!diary || !selectedDates.length) return;

    const dates = selectedDates.map((date) => {
      const key = toDateKey(date);
      return key;
    });

    setError(null);
    setNoteLoading(true);

    try {
      const latest = notes.find((note) => note.local_date === toDateKey(new Date()));
      if (latest && selectedDates.some((date) => toDateKey(date) === todayKey)) {
        throw new Error("Bạn đã ghi chú cho ngày hôm nay rồi.");
      }

      const result = await analyzeNoteForDiseases(id, dates);
      setProgress(result.progress ?? "");
      if (result.error) throw new Error(result.error);

      const nextNotes = await loadDiaryNotes(id);
      setNotes(nextNotes);
      setSelectedDates([new Date()]);
      setDraftDates([new Date()]);
      await refreshInsights();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu ghi chú.",
      );
    } finally {
      setNoteLoading(false);
    }
  }

  if (!diary) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const noteCount = notes.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 pb-28">
      <header className="flex items-start justify-between gap-3 rounded-box border border-base-300 bg-base-200 p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            Nhật ký
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">{diary.diary_name}</h1>
          {diary.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/75">
              {diary.description}
            </p>
          )}
          <p className="mt-2 text-sm text-base-content/70">
            Chuỗi hiện tại: {diary.current_streak} ngày
          </p>
          {diary.is_dead && (
            <span className="badge badge-error mt-2">Cây đã chết</span>
          )}
        </div>

        <Link className="btn btn-ghost btn-sm" href={`/diary/settings?id=${encodeURIComponent(id)}`}>
          Cài đặt
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Ghi chú</h2>
              <p className="text-sm text-base-content/70">
                {noteCount} ngày đã theo dõi
              </p>
            </div>

            <button
              className="btn btn-primary"
              disabled={!canCreateNote || noteLoading || hasTodayNote}
              onClick={handleSubmitNote}
            >
              {noteLoading ? <span className="loading loading-spinner" /> : "Ghi chú hôm nay"}
            </button>
          </div>

          {progress && <p className="text-sm text-info">{progress}</p>}
          {error && <div className="alert alert-error mt-3">{error}</div>}

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Chọn ngày</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setDatePickerOpen((value) => !value)}
              >
                {datePickerOpen ? "Ẩn" : "Mở"}
              </button>
            </div>

            <div className="rounded-box border border-base-300 bg-base-100 p-3">
              <p className="text-sm font-medium">{selectedDateLabel}</p>
            </div>

            {datePickerOpen && (
              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <Calendar
                  value={draftDates}
                  onChange={(dates) => {
                    const nextDates = dates.map((date) => new Date(date));
                    setDraftDates(nextDates);
                    setSelectedDates(nextDates);
                  }}
                />
              </div>
            )}

            <StreakCalendarInput
              createdAt={new Date(diary.created_at)}
              streaks={streaks}
              selectedDates={selectedDates}
              onChange={(dates) => {
                const nextDates = dates.map((date) => new Date(date));
                setSelectedDates(nextDates);
                setDraftDates(nextDates);
              }}
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card border border-base-300 bg-base-200 p-4 shadow-sm">
            <h2 className="text-lg font-bold">Tổng quan</h2>
            <div className="mt-3 space-y-2 text-sm text-base-content/75">
              <p>Số ngày ghi chép: {notes.length}</p>
              <p>Ngày đang chọn: {selectedDates.length}</p>
              <p>Ghi chú hôm nay: {hasTodayNote ? "Đã có" : "Chưa có"}</p>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-200 p-4 shadow-sm">
            <h2 className="text-lg font-bold">Chuỗi</h2>
            <div className="mt-3">
              <StreakCalendar
                createdAt={new Date(diary.created_at)}
                streaks={streaks}
              />
            </div>
          </div>
        </aside>
      </div>

      {selectedNote && (
        <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
          <h2 className="text-lg font-bold">Chi tiết ngày {formatDate(activeDate ?? new Date())}</h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <p className="text-sm font-medium">Lá đã phân tích</p>
                <p className="text-2xl font-black">{selectedNote.leaves.length}</p>
              </div>

              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <p className="text-sm font-medium">Vùng bệnh</p>
                <p className="text-2xl font-black">{totalRegionsInRange}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <p className="text-sm font-medium">Thiếu hụt đạm trung bình</p>
                <p className="text-2xl font-black">
                  {rowsInRange.length
                    ? `${Math.round(
                        rowsInRange.reduce((sum, row) => sum + Number(row.avg_nitrogen ?? 0), 0) /
                          rowsInRange.length,
                      )}%`
                    : "--"}
                </p>
              </div>

              {selectedNote.thought && (
                <div className="rounded-box border border-base-300 bg-base-100 p-3">
                  <p className="text-sm font-medium">Ghi chú của bạn</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">
                    {selectedNote.thought}
                  </p>
                </div>
              )}
            </div>
          </div>

          {detections.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {detections.map((detection) => (
                <div key={detection.id} className="rounded-box border border-base-300 bg-base-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">{detection.disease}</p>
                    <span className="badge badge-primary badge-sm">
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </div>
                  <img
                    src={convertFileSrc(detection.image_path)}
                    alt={detection.disease}
                    className="h-32 w-full rounded-box object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {chartRows.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <NoteCharts rows={chartRows} />
          <RangeCharts rows={chartRows} />
        </section>
      )}
    </main>
  );
}
