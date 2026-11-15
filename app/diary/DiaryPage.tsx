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
import { loadDiary, loadDiaryNotes, loadDiaryNoteDetails, type DiarySummary, type DiaryNote, type DiaryNoteDetails } from "@/app/lib/services/database";
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
import { nitrogenLevel } from "@/app/lib/services/diseaseAdvice";

interface Props { id: string }
function toDateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseDateKey(key: string): Date { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day); }
function expandDateRange(start: Date, end: Date): Date[] { const result: Date[] = []; const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate()); const last = new Date(end.getFullYear(), end.getMonth(), end.getDate()); while (cursor <= last) { result.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); } return result; }
function formatDate(date: Date): string { return date.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" }); }

const DiaryPage = ({ id }: Props) => {
  const calendarRef = useRef<Calendar | null>(null);
  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [notes, setNotes] = useState<DiaryNote[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [draftDates, setDraftDates] = useState<Date[]>([]);
  const [selectedNote, setSelectedNote] = useState<DiaryNoteDetails | null>(null);
  const [detections, setDetections] = useState<ParsedDetection[]>([]);
  const [chartRows, setChartRows] = useState<ChartRow[]>([]);
  const [diseaseLeaves, setDiseaseLeaves] = useState<DiseaseLeaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const refreshInsights = useCallback(async () => {
    const [rows, leaves] = await Promise.all([loadChartRows(), loadDiseaseLeaves(id)]);
    setChartRows(rows.filter((row) => row.diary_id === id));
    setDiseaseLeaves(leaves);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true); setError(null);
      try {
        const [diaryResult, notesResult] = await Promise.all([loadDiary(id), loadDiaryNotes(id)]);
        if (cancelled) return;
        if (!diaryResult) throw new Error("Không tìm thấy nhật ký.");
        setDiary(diaryResult); setNotes(notesResult);
        const initialDate = new Date(); setSelectedDates([initialDate]); setDraftDates([initialDate]);
        await refreshInsights();
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể tải nhật ký."); }
      finally { if (!cancelled) setLoading(false); }
    }
    initialize(); return () => { cancelled = true; };
  }, [id, refreshInsights]);

  const hasTodayNote = useMemo(() => notes.some((note) => note.local_date === todayKey), [notes, todayKey]);
  const canCreateNote = Boolean(diary && (!diary.is_dead || diary.allow_dead_notes));
  const streaks = useMemo(() => notes.map((note) => parseDateKey(note.local_date)), [notes]);
  const selectedNoteDates = useMemo(() => new Set(selectedDates.map(toDateKey)), [selectedDates]);
  const notesInRange = useMemo(() => notes.filter((note) => selectedNoteDates.has(note.local_date)), [notes, selectedNoteDates]);
  const rowsInRange = useMemo(() => chartRows.filter((row) => row.note_id && selectedNoteDates.has(row.local_date)), [chartRows, selectedNoteDates]);
  const diseaseLeavesInRange = useMemo(() => diseaseLeaves.filter((leaf) => selectedNoteDates.has(leaf.local_date)), [diseaseLeaves, selectedNoteDates]);
  const totalLeavesInRange = useMemo(() => rowsInRange.reduce((total, row) => total + row.leaf_count, 0), [rowsInRange]);
  const totalRegionsInRange = useMemo(() => diseaseLeavesInRange.reduce((total, leaf) => total + leaf.predictions.length, 0), [diseaseLeavesInRange]);
  const isSingleDate = selectedDates.length === 1;
  const selectedDateLabel = useMemo(() => {
    if (!selectedDates.length) return "Chọn ngày";
    if (isSingleDate) return formatDate(selectedDates[0]);
    return `${formatDate(selectedDates[0])} - ${formatDate(selectedDates[selectedDates.length - 1])}`;
  }, [selectedDates, isSingleDate]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelectedNote() {
      setSelectedNote(null); setDetections([]); if (!isSingleDate) return;
      const note = notes.find((item) => item.local_date === toDateKey(selectedDates[0])); if (!note) return;
      setNoteLoading(true);
      try {
        const [details, records] = await Promise.all([loadDiaryNoteDetails(note.id), loadDiseaseResults(note.id)]);
        if (cancelled) return;
        setSelectedNote(details); setDetections(records.map(parseDetection));
      }
      catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể tải nội dung nhật ký."); }
      finally { if (!cancelled) setNoteLoading(false); }
    }
    loadSelectedNote(); return () => { cancelled = true; };
  }, [selectedDates, notes, isSingleDate]);

  const runAnalysis = useCallback(async () => {
    if (!selectedNote) return;
    setAnalyzing(true); setProgress("");
    try {
      await analyzeNoteForDiseases(selectedNote.id, selectedNote.leaves.map((leaf) => leaf.file_path), setProgress);
      const records = await loadDiseaseResults(selectedNote.id);
      setDetections(records.map(parseDetection));
      await refreshInsights();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nhận diện bệnh.");
    } finally { setAnalyzing(false); }
  }, [selectedNote, refreshInsights]);

  const detectionByPath = useMemo(() => new Map(detections.map((d) => [d.leaf_path, d])), [detections]);
  const notePredictions = useMemo(() => detections.filter((d) => d.status === "complete").flatMap((d) => d.predictions), [detections]);
  const noteAvgNitrogen = useMemo(() => {
    if (!selectedNote?.leaves.length) return null;
    return selectedNote.leaves.reduce((sum, leaf) => sum + Number(leaf.nitrogen_deficiency), 0) / selectedNote.leaves.length;
  }, [selectedNote]);
  const needsAnalysis = Boolean(selectedNote?.leaves.length) && (detections.length === 0 || detections.some((d) => d.status !== "complete"));

  const onChoosingDates = useCallback((self: Calendar) => {
    const selected = self.context.selectedDates;
    if (!selected.length) { setDraftDates([]); return; }
    const dates = selected.map((date) => parseDateKey(String(date)));
    if (dates.length === 1) { setDraftDates(dates); return; }
    const [first, second] = dates; setDraftDates(expandDateRange(first <= second ? first : second, first <= second ? second : first));
  }, []);
  const handleSelectAllDates = useCallback(() => {
    if (!notes.length) return;
    const sorted = [...notes].sort((a, b) => a.local_date.localeCompare(b.local_date));
    const start = sorted[0].local_date, end = sorted[sorted.length - 1].local_date;
    calendarRef.current?.set({ selectedDates: [`${start}:${end}`] }, { dates: true });
    setDraftDates(expandDateRange(parseDateKey(start), parseDateKey(end)));
  }, [notes]);

  if (loading) return <div className="w-full p-8 flex justify-center"><span className="loading loading-spinner loading-lg" /></div>;
  if (error && !diary) return <div className="alert alert-error m-4">{error}</div>;
  if (!diary) return null;

  return <main className="w-full p-4 flex flex-col gap-5 items-center">
    <header className="w-full flex items-start justify-between gap-3"><div><h1 className="text-2xl font-black">{diary.diary_name}</h1>{diary.description && <p className="mt-1 text-sm opacity-75 whitespace-pre-wrap">{diary.description}</p>}<p className="text-sm opacity-60 mt-1">Chuỗi hiện tại: {diary.current_streak} ngày</p>{diary.is_dead && <span className="badge badge-error mt-2">Cây đã chết</span>}</div><Link className="btn btn-ghost btn-sm" href={`/diary/settings?id=${encodeURIComponent(id)}`}>Cài đặt</Link></header>
    {!hasTodayNote && (canCreateNote ? <section className="w-full"><Link href={`/note/create?diary_id=${encodeURIComponent(id)}`} className="btn btn-primary w-full"><span className="text-lg">+</span>Cập nhật cho hôm nay</Link></section> : <div className="alert alert-warning w-full"><span>Cây đã chết nên ghi chú mới đang bị khóa. Bật “chế độ cây xác sống” trong cài đặt nếu bạn vẫn muốn tiếp tục theo dõi.</span></div>)}
    <section className="w-full"><StreakCalendar createdAt={new Date(diary.created_at)} streaks={streaks} /></section>
    <div className="divider divider-start"><span className="font-semibold">Thống kê nhật ký</span></div>
    <section className="w-full relative"><button onClick={() => { setDraftDates(selectedDates); setDatePickerOpen((value) => !value); }} className="btn btn-ghost border border-base-300 w-full justify-between"><span>{selectedDateLabel}</span><span className="text-xs opacity-60">{datePickerOpen ? "▲" : "▼"}</span></button>
      {datePickerOpen && <div className="absolute top-full left-0 mt-2 z-30 bg-base-100 border border-base-300 shadow-xl rounded-box p-4 w-full"><div className="flex justify-between items-center gap-2 mb-3"><h3 className="font-bold">Chọn khoảng thời gian</h3><button className="btn btn-xs btn-ghost" onClick={handleSelectAllDates} disabled={!notes.length}>Chọn tất cả ngày</button></div><StreakCalendarInput createdAt={new Date(diary.created_at)} streaks={streaks} selectionMethod="multiple-ranged" onClickDate={onChoosingDates} calendarInstanceRef={calendarRef} /><div className="flex justify-end gap-2 mt-4"><button className="btn btn-sm" onClick={() => { setDraftDates(selectedDates); setDatePickerOpen(false); }}>Hủy</button><button className="btn btn-sm btn-primary" onClick={() => { setSelectedDates(draftDates); setDatePickerOpen(false); }} disabled={!draftDates.length}>Chọn</button></div></div>}
    </section>

    <section className="w-full flex flex-col gap-4">
      {notesInRange.length === 0 ? (
        <div className="text-center opacity-60 p-8"><p className="font-semibold">Không có nhật ký trong khoảng thời gian này.</p></div>
      ) : isSingleDate ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">{selectedDateLabel}</h2>
          {noteLoading ? <span className="loading loading-spinner loading-md" /> : selectedNote ? <>
            {selectedNote.thumbnail_path && <img src={convertFileSrc(selectedNote.thumbnail_path)} alt="Ảnh nhật ký" className="w-full max-h-64 object-cover rounded-box" />}

            <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
              <div className="stat"><div className="stat-title">Số lượng lá</div><div className="stat-value">{selectedNote.leaves.length}</div></div>
              <div className="stat"><div className="stat-title">Thiếu đạm trung bình</div><div className="stat-value text-3xl" style={{ color: noteAvgNitrogen !== null ? nitrogenLevel(noteAvgNitrogen).color : undefined }}>{noteAvgNitrogen !== null ? `${noteAvgNitrogen.toFixed(1)}%` : "—"}</div></div>
              <div className="stat"><div className="stat-title">Vùng bệnh nhận diện</div><div className="stat-value">{notePredictions.length}</div></div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {needsAnalysis && <button className="btn btn-sm btn-primary" onClick={runAnalysis} disabled={analyzing}>{analyzing ? <span className="loading loading-spinner loading-xs" /> : null}{detections.length ? "Nhận diện lại bệnh" : "Nhận diện bệnh trên lá"}</button>}
              {!needsAnalysis && selectedNote.leaves.length > 0 && <button className="btn btn-sm btn-ghost border border-base-300" onClick={runAnalysis} disabled={analyzing}>{analyzing ? <span className="loading loading-spinner loading-xs" /> : null}Nhận diện lại</button>}
              {progress && <span className="text-sm opacity-70">{progress}</span>}
            </div>

            <NoteCharts leaves={selectedNote.leaves} detections={detections} />

            {selectedNote.thought && <article className="card bg-base-200 p-4"><h3 className="font-bold mb-2">Suy nghĩ hôm đó</h3><p className="whitespace-pre-wrap">{selectedNote.thought}</p></article>}

            <h3 className="font-bold">Chi tiết từng lá</h3>
            <div className="flex flex-col gap-3">{selectedNote.leaves.map((leaf, index) => {
              const found = detectionByPath.get(leaf.file_path);
              const level = nitrogenLevel(Number(leaf.nitrogen_deficiency));
              const status = !found ? null : found.status !== "complete" ? (found.status === "offline" ? "Ngoại tuyến" : "Lỗi nhận diện") : found.predictions.length ? `${found.predictions.length} vùng bệnh` : "Không phát hiện bệnh";
              return <div key={leaf.id} className="card bg-base-200 p-3 gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">Lá {index + 1}</span>{status && <span className={`badge ${found?.status === "complete" ? (found.predictions.length ? "badge-error" : "badge-success") : "badge-ghost"}`}>{status}</span>}</div>
                <DiseaseOverlay src={convertFileSrc(leaf.file_path)} predictions={found?.status === "complete" ? found.predictions : []} imageSize={found?.image} />
                <p className="text-sm">Thiếu hụt Nitrogen: <span className="font-semibold" style={{ color: level.color }}>{Number(leaf.nitrogen_deficiency)}% · {level.label}</span></p>
              </div>;
            })}</div>

            <AdviceCards predictions={notePredictions} nitrogen={noteAvgNitrogen} seed={selectedNote.id} />
          </> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Tổng quan khoảng thời gian</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat"><div className="stat-title">Số ngày có nhật ký</div><div className="stat-value">{notesInRange.length}</div></div>
            <div className="stat"><div className="stat-title">Tổng số lá chụp</div><div className="stat-value">{totalLeavesInRange}</div></div>
            <div className="stat"><div className="stat-title">Vùng bệnh nhận diện</div><div className="stat-value">{totalRegionsInRange}</div></div>
          </div>
          <RangeCharts rows={rowsInRange} diseaseLeaves={diseaseLeavesInRange} />
          <div className="flex flex-col gap-2">{notesInRange.map((note) => <button key={note.id} className="btn btn-ghost justify-between border border-base-300" onClick={() => { const date = parseDateKey(note.local_date); setSelectedDates([date]); setDraftDates([date]); }}><span>{note.local_date}</span><span>Chi tiết →</span></button>)}</div>
        </div>
      )}
    </section>
    {error && <div className="alert alert-error w-full">{error}<button className="btn btn-sm" onClick={() => setError(null)}>Đóng</button></div>}
  </main>;
};
export default DiaryPage;
