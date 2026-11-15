"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import StreakCalendar from "./components/Diary/StreakCalendar";
import StreakCalendarInput from "./components/Diary/StreakCalendarInput";
import { NoteCharts, RangeCharts } from "./components/Diary/NoteCharts";
import DiseaseOverlay from "./components/Diary/DiseaseOverlay";
import AdviceCards from "./components/Diary/AdviceCards";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
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
import { nitrogenLevel } from "@/app/lib/services/diseaseAdvice";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-black"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export default function DiaryPage({ id }: { id: string }) {
  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedNote, setSelectedNote] = useState<DiaryNoteDetails | null>(
    null,
  );
  const [detections, setDetections] = useState<ParsedDetection[]>([]);
  const [chartRows, setChartRows] = useState<ChartRow[]>([]);
  const [diseaseLeaves, setDiseaseLeaves] = useState<DiseaseLeaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
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
      setLoading(true);
      setError(null);
      try {
        const [diaryResult, notesResult] = await Promise.all([
          loadDiary(id),
          loadDiaryNotes(id),
        ]);

        if (cancelled) return;
        if (!diaryResult) throw new Error("Không tìm thấy nhật ký.");

        setDiary(diaryResult);
        setNotes(notesResult);
        setSelectedDates([new Date()]);
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

    void initialize();
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
  const rowsInRange = useMemo(
    () => chartRows.filter((row) => selectedNoteDates.has(row.local_date)),
    [chartRows, selectedNoteDates],
  );
  const diseaseLeavesInRange = useMemo(
    () =>
      diseaseLeaves.filter((leaf) => selectedNoteDates.has(leaf.local_date)),
    [diseaseLeaves, selectedNoteDates],
  );
  const totalRegionsInRange = useMemo(
    () =>
      diseaseLeavesInRange.reduce(
        (total, leaf) => total + leaf.predictions.length,
        0,
      ),
    [diseaseLeavesInRange],
  );
  const totalLeavesInRange = useMemo(
    () => rowsInRange.reduce((sum, row) => sum + row.leaf_count, 0),
    [rowsInRange],
  );
  const isSingleDate = selectedDates.length === 1;
  const selectedDateLabel = useMemo(() => {
    if (!selectedDates.length) return "Chọn ngày";
    const sortedDates = [...selectedDates].sort(
      (a, b) => a.getTime() - b.getTime(),
    );
    if (isSingleDate) return formatDate(sortedDates[0]);
    return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  }, [selectedDates, isSingleDate]);

  const noteNitrogen = useMemo(() => {
    const valid = rowsInRange.filter((r) => r.avg_nitrogen !== null);
    if (!valid.length) return null;
    return (
      valid.reduce((sum, r) => sum + Number(r.avg_nitrogen), 0) / valid.length
    );
  }, [rowsInRange]);
  const noteNitrogenLevel =
    noteNitrogen !== null ? nitrogenLevel(noteNitrogen) : null;

  const allPredictions = useMemo(
    () =>
      detections
        .filter((d) => d.status === "complete")
        .flatMap((d) => d.predictions),
    [detections],
  );

  const noteSeed =
    isSingleDate && selectedDates[0] ? toDateKey(selectedDates[0]) : id;

  const hasNoteForSelectedDate = useMemo(() => {
    if (!isSingleDate || !selectedDates[0]) return false;
    const key = toDateKey(selectedDates[0]);
    return notes.some((n) => n.local_date === key);
  }, [notes, selectedDates, isSingleDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedNote() {
      if (!isSingleDate || !selectedDates[0]) {
        if (!cancelled) {
          setSelectedNote(null);
          setDetections([]);
          setNoteLoading(false);
        }
        return;
      }

      const note = notes.find(
        (item) => item.local_date === toDateKey(selectedDates[0]),
      );
      if (!note) {
        if (!cancelled) {
          setSelectedNote(null);
          setDetections([]);
          setNoteLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setNoteLoading(true);
        setSelectedNote(null);
        setDetections([]);
      }

      try {
        const detail = await loadDiaryNoteDetails(note.id);
        if (cancelled) return;
        if (!detail) {
          setNoteLoading(false);
          return;
        }

        const records = await loadDiseaseResults(note.id);
        if (cancelled) return;
        setSelectedNote(detail);
        setDetections(records.map(parseDetection));
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải chi tiết ghi chú.",
          );
        }
      } finally {
        if (!cancelled) setNoteLoading(false);
      }
    }

    void loadSelectedNote();
    return () => {
      cancelled = true;
    };
  }, [isSingleDate, notes, selectedDates]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        {error && (
          <div role="alert" className="alert alert-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 pb-28">
      <header className="flex items-start justify-between gap-3 rounded-box border border-base-300 bg-base-200 p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            Nhật ký
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {diary.diary_name}
          </h1>
          {diary.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/75">
              {diary.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-primary badge-sm">
              Chuỗi: {diary.current_streak} ngày
            </span>
            {diary.is_dead ? (
              <span className="badge badge-error badge-sm">Cây đã chết</span>
            ) : (
              <span className="badge badge-success badge-sm">
                Đang phát triển
              </span>
            )}
          </div>
        </div>

        <Link
          className="btn btn-ghost btn-sm shrink-0"
          href={`/diary/settings?id=${encodeURIComponent(id)}`}
        >
          Cài đặt
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Ghi chú</h2>
              <p className="text-sm text-base-content/70">
                {notes.length} ngày đã theo dõi
              </p>
            </div>

            <Link
              className={`btn btn-primary btn-sm ${!canCreateNote || hasTodayNote ? "btn-disabled" : ""}`}
              aria-disabled={!canCreateNote || hasTodayNote}
              href={
                canCreateNote && !hasTodayNote
                  ? `/note/create?diary_id=${encodeURIComponent(id)}`
                  : "#"
              }
              onClick={(event) => {
                if (!canCreateNote || hasTodayNote) event.preventDefault();
              }}
            >
              {hasTodayNote ? "Đã ghi hôm nay" : "Ghi chú hôm nay"}
            </Link>
          </div>

          {error && (
            <div role="alert" className="alert alert-error mt-3">
              {error}
            </div>
          )}

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
              {selectedDates.length > 1 && (
                <p className="mt-1 text-xs text-base-content/60">
                  {selectedDates.length} ngày được chọn
                </p>
              )}
            </div>

            {datePickerOpen && (
              <StreakCalendarInput
                createdAt={new Date(diary.created_at)}
                streaks={streaks}
                selectedDates={selectedDates}
                onChange={setSelectedDates}
              />
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card border border-base-300 bg-base-200 p-4 shadow-sm">
            <h2 className="text-lg font-bold">Tổng quan</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-base-content/75">
              <div className="rounded-box bg-base-100 p-2">
                <p className="text-xs opacity-60">Số ngày</p>
                <p className="text-lg font-bold">{notes.length}</p>
              </div>
              <div className="rounded-box bg-base-100 p-2">
                <p className="text-xs opacity-60">Đang chọn</p>
                <p className="text-lg font-bold">{selectedDates.length}</p>
              </div>
              <div className="col-span-2 rounded-box bg-base-100 p-2">
                <p className="text-xs opacity-60">Ghi chú hôm nay</p>
                <p className="text-lg font-bold">
                  {hasTodayNote ? "Đã có" : "Chưa có"}
                </p>
              </div>
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

      {isSingleDate && (
        <>
          {noteLoading && (
            <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="loading loading-spinner loading-md" />
                <span className="text-sm text-base-content/70">
                  Đang tải chi tiết ghi chú…
                </span>
              </div>
            </section>
          )}

          {!noteLoading && !hasNoteForSelectedDate && (
            <div className="alert">
              <span>
                Chưa có ghi chú cho ngày {formatDate(selectedDates[0])}.
              </span>
            </div>
          )}

          {!noteLoading && selectedNote && (
            <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {formatDate(selectedDates[0])}
                  </h2>
                  <p className="text-sm text-base-content/70">
                    Chi tiết ghi chú
                  </p>
                </div>
                {noteNitrogenLevel && (
                  <span
                    className="badge border-0 text-white"
                    style={{ backgroundColor: noteNitrogenLevel.color }}
                  >
                    Thiếu đạm: {noteNitrogenLevel.label}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Lá đã phân tích"
                  value={selectedNote.leaves.length}
                />
                <StatCard label="Vùng bệnh" value={totalRegionsInRange} />
                <StatCard
                  label="Thiếu hụt đạm TB"
                  value={
                    noteNitrogen !== null
                      ? `${Math.round(noteNitrogen)}%`
                      : "--"
                  }
                  accent={noteNitrogenLevel?.color}
                />
              </div>

              {selectedNote.thought && (
                <div className="mt-4 rounded-box border border-base-300 bg-base-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                    Ghi chú của bạn
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">
                    {selectedNote.thought}
                  </p>
                </div>
              )}

              {selectedNote.leaves.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 flex items-center gap-2 font-bold">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                    Lá đã phân tích ({selectedNote.leaves.length})
                  </h3>
                  <div className="grid items-start gap-4 md:grid-cols-2">
                    {selectedNote.leaves.map((leaf, index) => {
                      const detection = detections.find(
                        (d) => d.leaf_path === leaf.file_path,
                      );
                      const preds = detection?.predictions ?? [];
                      const leafLevel = nitrogenLevel(
                        Number(leaf.nitrogen_deficiency),
                      );
                      return (
                        <article
                          key={leaf.file_path}
                          className="card border border-base-300 bg-base-100 p-3 shadow-sm"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="badge badge-primary badge-sm">
                              Lá {index + 1}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="badge badge-sm border-0 text-white"
                                style={{ backgroundColor: leafLevel.color }}
                              >
                                Thiếu đạm{" "}
                                {Math.round(Number(leaf.nitrogen_deficiency))}%
                              </span>
                              {preds.length > 0 ? (
                                <span className="badge badge-error badge-sm">
                                  {preds.length} vùng bệnh
                                </span>
                              ) : detection?.status === "complete" ? (
                                <span className="badge badge-success badge-sm">
                                  Không bệnh
                                </span>
                              ) : detection?.status === "offline" ? (
                                <span className="badge badge-ghost badge-sm">
                                  Không bệnh
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <DiseaseOverlay
                            src={convertFileSrc(leaf.file_path)}
                            predictions={preds}
                            alt={`Lá ${index + 1}`}
                          />
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <AdviceCards
                  predictions={allPredictions}
                  nitrogen={noteNitrogen}
                  seed={noteSeed}
                />
              </div>

              <div className="mt-6">
                <NoteCharts
                  leaves={selectedNote.leaves}
                  detections={detections}
                />
              </div>
            </section>
          )}
        </>
      )}

      {!isSingleDate &&
        (rowsInRange.length > 0 || diseaseLeavesInRange.length > 0) && (
          <section className="card border border-base-300 bg-base-200 p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-black tracking-tight">Tổng hợp</h2>
              <p className="text-sm text-base-content/70">
                {selectedDateLabel}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Ngày có ghi chú" value={rowsInRange.length} />
              <StatCard label="Lá đã phân tích" value={totalLeavesInRange} />
              <StatCard label="Vùng bệnh" value={totalRegionsInRange} />
              <StatCard
                label="Thiếu hụt đạm TB"
                value={
                  noteNitrogen !== null ? `${Math.round(noteNitrogen)}%` : "--"
                }
                accent={noteNitrogenLevel?.color}
              />
            </div>

            <div className="mt-6">
              <RangeCharts
                rows={rowsInRange}
                diseaseLeaves={diseaseLeavesInRange}
              />
            </div>
          </section>
        )}
    </main>
  );
}
