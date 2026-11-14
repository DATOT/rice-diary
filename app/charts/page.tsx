"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { loadChartRows, type ChartRow } from "@/app/lib/services/insights";

export default function ChartsPage() {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [diaryId, setDiaryId] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => { loadChartRows().then(setRows).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu biểu đồ.")); }, []);
  const diaries = useMemo(() => Array.from(new Map(rows.map((row) => [row.diary_id, row.diary_name])).entries()), [rows]);
  const selected = useMemo(() => diaryId === "all" ? rows : rows.filter((row) => row.diary_id === diaryId), [diaryId, rows]);
  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; nitrogen: number; notes: number; diseases: number }>();
    for (const row of selected) {
      if (!row.note_id) continue;
      const entry = byDate.get(row.local_date) ?? { date: row.local_date, nitrogen: 0, notes: 0, diseases: 0 };
      entry.notes += 1;
      entry.diseases += row.disease_count || 0;
      if (row.avg_nitrogen !== null) entry.nitrogen += row.avg_nitrogen;
      byDate.set(row.local_date, entry);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [selected]);
  const topFive = useMemo(() => {
    const counts = new Map<string, number>();
    selected.forEach((row) => row.disease_names?.split(",").filter(Boolean).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1)));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [selected]);
  const totalNotes = selected.filter((row) => row.note_id).length;
  const totalLeaves = selected.reduce((total, row) => total + row.leaf_count, 0);
  const totalDiseases = selected.reduce((total, row) => total + row.disease_count, 0);
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-28">
    <header><h1 className="text-2xl font-black">Biểu đồ & thống kê</h1><p className="mt-1 text-sm opacity-70">Theo dõi nhật ký, lá và kết quả nhận diện bệnh.</p></header>
    <label className="form-control gap-2"><span className="font-semibold">Chọn nhật ký</span><select className="select select-bordered min-h-12 w-full" value={diaryId} onChange={(event) => setDiaryId(event.target.value)}><option value="all">Tất cả cây</option>{diaries.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <section className="stats stats-vertical w-full shadow sm:stats-horizontal">
      <div className="stat"><div className="stat-title">Số ngày ghi chép</div><div className="stat-value text-3xl">{totalNotes}</div></div>
      <div className="stat"><div className="stat-title">Lá đã phân tích</div><div className="stat-value text-3xl">{totalLeaves}</div></div>
      <div className="stat"><div className="stat-title">Vùng bệnh nhận diện</div><div className="stat-value text-3xl">{totalDiseases}</div></div>
    </section>
    <section className="card gap-3 bg-base-200 p-4"><h2 className="font-bold">Xu hướng theo ngày (30 ngày gần nhất)</h2>{trend.length ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="nitrogen" name="Nitrogen" stroke="#16a34a" connectNulls /><Line type="monotone" dataKey="diseases" name="Vùng bệnh" stroke="#dc2626" /></LineChart></ResponsiveContainer></div> : <p className="text-sm opacity-70">Chưa có đủ dữ liệu để vẽ bi��u đồ.</p>}</section>
    <section className="card gap-3 bg-base-200 p-4"><h2 className="font-bold">5 bệnh được nhận diện nhiều nhất</h2>{topFive.length ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={topFive} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Số vùng" fill="#e87924" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <p className="text-sm opacity-70">Chưa có kết quả nhận diện bệnh. Khi ngoại tuyến, tính năng nhận diện sẽ tự bỏ qua.</p>}</section>
    <section className="card gap-3 bg-base-200 p-4"><h2 className="font-bold">Thống kê theo cây</h2>{diaries.map(([id, name]) => { const diaryRows = rows.filter((row) => row.diary_id === id); return <article key={id} className="rounded-box bg-base-100 p-3"><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm opacity-75">{diaryRows.filter((row) => row.note_id).length} ngày ghi chép · {diaryRows.reduce((n, row) => n + row.leaf_count, 0)} lá · {diaryRows.reduce((n, row) => n + row.disease_count, 0)} vùng bệnh</p></article>; })}</section>
    {error && <div role="alert" className="alert alert-error">{error}</div>}
  </main>;
}
