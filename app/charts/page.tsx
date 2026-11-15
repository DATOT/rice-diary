"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  loadChartRows,
  loadDiseaseLeaves,
  loadLeafRows,
  type ChartRow,
  type DiseaseLeaf,
  type LeafRow,
} from "@/app/lib/services/insights";
import {
  diseaseColor,
  diseaseKey,
  diseaseName,
  NITROGEN_LEVELS,
  nitrogenLevel,
} from "@/app/lib/services/diseaseAdvice";
import { ChartCard } from "@/app/diary/components/Diary/NoteCharts";
import DiseaseOverlay from "@/app/diary/components/Diary/DiseaseOverlay";
import AdviceCards from "@/app/diary/components/Diary/AdviceCards";

export default function ChartsPage() {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [leafRows, setLeafRows] = useState<LeafRow[]>([]);
  const [detections, setDetections] = useState<DiseaseLeaf[]>([]);
  const [diaryId, setDiaryId] = useState("all");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadChartRows()
      .then(setRows)
      .catch((e) => setError((prev) => `${prev}\nloadChartRows: ${e}`));
    loadLeafRows()
      .then(setLeafRows)
      .catch((e) => setError((prev) => `${prev}\nloadLeafRows: ${e}`));
    loadDiseaseLeaves()
      .then(setDetections)
      .catch((e) => setError((prev) => `${prev}\nloadDiseaseLeaves: ${e}`));
  }, []);

  const diaries = useMemo(
    () =>
      Array.from(
        new Map(rows.map((row) => [row.diary_id, row.diary_name])).entries(),
      ),
    [rows],
  );
  const inDiary = <T extends { diary_id: string }>(item: T) =>
    diaryId === "all" || item.diary_id === diaryId;
  const selected = useMemo(() => rows.filter(inDiary), [rows, diaryId]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedLeaves = useMemo(
    () => leafRows.filter(inDiary),
    [leafRows, diaryId],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedDetections = useMemo(
    () => detections.filter(inDiary),
    [detections, diaryId],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const trend = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        sum: number;
        n: number;
        leaves: number;
        notes: number;
        diseases: number;
      }
    >();
    for (const row of selected) {
      if (!row.note_id) continue;
      const entry = byDate.get(row.local_date) ?? {
        date: row.local_date,
        sum: 0,
        n: 0,
        leaves: 0,
        notes: 0,
        diseases: 0,
      };
      entry.notes += 1;
      entry.leaves += row.leaf_count;
      if (row.avg_nitrogen !== null) {
        entry.sum += Number(row.avg_nitrogen);
        entry.n += 1;
      }
      byDate.set(row.local_date, entry);
    }
    for (const leaf of selectedDetections) {
      const entry = byDate.get(leaf.local_date);
      if (entry) entry.diseases += leaf.predictions.length;
    }
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((e) => ({
        date: e.date,
        nitrogen: e.n ? Number((e.sum / e.n).toFixed(1)) : null,
        leaves: e.leaves,
        notes: e.notes,
        diseases: e.diseases,
      }));
  }, [selected, selectedDetections]);

  const classKeys = useMemo(
    () =>
      Array.from(
        new Set(
          selectedDetections.flatMap((d) =>
            d.predictions.map((p) => diseaseKey(p.class)),
          ),
        ),
      ),
    [selectedDetections],
  );

  const stackedByDay = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>();
    for (const leaf of selectedDetections) {
      const entry = byDate.get(leaf.local_date) ?? { date: leaf.local_date };
      for (const p of leaf.predictions) {
        const key = diseaseKey(p.class);
        entry[key] = ((entry[key] as number) || 0) + 1;
      }
      byDate.set(leaf.local_date, entry);
    }
    return Array.from(byDate.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(-30);
  }, [selectedDetections]);

  const distribution = useMemo(() => {
    const counts = new Map<string, { count: number; confidence: number }>();
    for (const leaf of selectedDetections)
      for (const p of leaf.predictions) {
        const key = diseaseKey(p.class);
        const entry = counts.get(key) ?? { count: 0, confidence: 0 };
        entry.count += 1;
        entry.confidence += p.confidence;
        counts.set(key, entry);
      }
    return Array.from(counts, ([key, v]) => ({
      key,
      name: diseaseName(key),
      count: v.count,
      confidence: Math.round((v.confidence / v.count) * 100),
      color: diseaseColor(key),
    })).sort((a, b) => b.count - a.count);
  }, [selectedDetections]);

  const nitrogenBands = useMemo(
    () =>
      NITROGEN_LEVELS.map((level) => ({
        name: level.label,
        color: level.color,
        count: selectedLeaves.filter(
          (leaf) =>
            nitrogenLevel(Number(leaf.nitrogen_deficiency)).key === level.key,
        ).length,
      })),
    [selectedLeaves],
  );

  const perDiary = useMemo(
    () =>
      diaries.map(([id, name]) => {
        const leaves = leafRows.filter((leaf) => leaf.diary_id === id);
        const regions = detections
          .filter((d) => d.diary_id === id)
          .reduce((n, d) => n + d.predictions.length, 0);
        const avg = leaves.length
          ? leaves.reduce((s, l) => s + Number(l.nitrogen_deficiency), 0) /
            leaves.length
          : 0;
        return {
          id,
          name,
          avgNitrogen: Number(avg.toFixed(1)),
          regions,
          notes: rows.filter((r) => r.diary_id === id && r.note_id).length,
          leaves: leaves.length,
        };
      }),
    [diaries, leafRows, detections, rows],
  );

  const totalNotes = selected.filter((row) => row.note_id).length;
  const totalLeaves = selectedLeaves.length;
  const totalRegions = distribution.reduce((total, d) => total + d.count, 0);
  const diseasedLeafCount = selectedDetections.filter(
    (d) => d.predictions.length > 0,
  ).length;

  // ----- Tìm lá bị bệnh -----
  const diseaseOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of selectedDetections) {
      for (const key of new Set(d.predictions.map((p) => diseaseKey(p.class))))
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map, ([key, count]) => ({
      key,
      count,
      name: diseaseName(key),
    })).sort((a, b) => b.count - a.count);
  }, [selectedDetections]);

  const diseasedLeaves = useMemo(
    () =>
      selectedDetections
        .filter((d) =>
          d.predictions.some(
            (p) =>
              diseaseFilter === "all" || diseaseKey(p.class) === diseaseFilter,
          ),
        )
        .sort((a, b) => b.local_date.localeCompare(a.local_date)),
    [selectedDetections, diseaseFilter],
  );
  const activeLeaf =
    diseasedLeaves.find((d) => d.result_id === selectedResultId) ??
    diseasedLeaves[0] ??
    null;
  const activeNitrogen = activeLeaf
    ? (leafRows.find(
        (l) =>
          l.note_id === activeLeaf.note_id &&
          l.file_path === activeLeaf.leaf_path,
      )?.nitrogen_deficiency ?? null)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-28">
      <header>
        <h1 className="text-2xl font-black">Biểu đồ & thống kê</h1>
        <p className="mt-1 text-sm opacity-70">
          Theo dõi nhật ký, lá, thiếu hụt đạm và kết quả nhận diện bệnh.
        </p>
      </header>

      <label className="form-control gap-2">
        <span className="font-semibold">Chọn nhật ký</span>
        <select
          className="select select-bordered min-h-12 w-full"
          value={diaryId}
          onChange={(event) => {
            setDiaryId(event.target.value);
            setSelectedResultId("");
          }}
        >
          <option value="all">Tất cả cây</option>
          {diaries.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <section className="stats stats-vertical w-full shadow sm:stats-horizontal">
        <div className="stat">
          <div className="stat-title">Số ngày ghi chép</div>
          <div className="stat-value text-3xl">{totalNotes}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Lá đã phân tích</div>
          <div className="stat-value text-3xl">{totalLeaves}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Lá có bệnh</div>
          <div className="stat-value text-3xl">{diseasedLeafCount}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Vùng bệnh</div>
          <div className="stat-value text-3xl">{totalRegions}</div>
        </div>
      </section>

      <ChartCard
        title="Xu hướng thiếu hụt đạm theo ngày (%)"
        empty={
          trend.some((t) => t.nitrogen !== null)
            ? undefined
            : "Chưa có đủ dữ liệu để vẽ biểu đồ."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trend}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="nitrogen"
              name="Thiếu đạm TB (%)"
              stroke="#16a34a"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Số lá chụp và vùng bệnh theo ngày"
        empty={trend.length ? undefined : "Chưa có dữ liệu."}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={trend}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="leaves"
              name="Số lá"
              fill="#0891b2"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="diseases"
              name="Vùng bệnh"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Mức độ thiếu hụt đạm của các lá"
        empty={totalLeaves ? undefined : "Chưa có lá nào."}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={nitrogenBands}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Số lá" radius={[6, 6, 0, 0]}>
              {nitrogenBands.map((band) => (
                <Cell key={band.name} fill={band.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-5 sm:grid-cols-2">
        <ChartCard
          title="Tỷ lệ các loại bệnh"
          empty={
            distribution.length
              ? undefined
              : "Chưa có kết quả nhận diện bệnh. Khi ngoại tuyến, tính năng nhận diện sẽ tự bỏ qua."
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="name"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                label={({ value }) => String(value)}
              >
                {distribution.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Độ tin cậy trung bình theo bệnh (%)"
          empty={distribution.length ? undefined : "Chưa có dữ liệu."}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distribution}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Bar dataKey="confidence" name="Độ tin cậy" radius={[0, 6, 6, 0]}>
                {distribution.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Bệnh theo ngày (xếp chồng)"
        empty={
          stackedByDay.length ? undefined : "Chưa có kết quả nhận diện bệnh."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stackedByDay}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {classKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                name={diseaseName(key)}
                stackId="d"
                fill={diseaseColor(key)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {diaryId === "all" && perDiary.length > 1 && (
        <ChartCard title="So sánh giữa các cây">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={perDiary}
              margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="avgNitrogen"
                name="Thiếu đạm TB (%)"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="regions"
                name="Vùng bệnh"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ---- Tìm lá bị bệnh ---- */}
      <section className="card gap-3 bg-base-200 p-4">
        <h2 className="font-bold">Tìm lá bị bệnh</h2>
        <label className="form-control gap-1">
          <span className="text-sm font-semibold">Loại bệnh</span>
          <select
            className="select select-bordered w-full"
            value={diseaseFilter}
            onChange={(e) => {
              setDiseaseFilter(e.target.value);
              setSelectedResultId("");
            }}
          >
            <option value="all">
              Tất cả bệnh (
              {selectedDetections.filter((d) => d.predictions.length).length}{" "}
              lá)
            </option>
            {diseaseOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name} ({o.count} lá)
              </option>
            ))}
          </select>
        </label>
        {diseasedLeaves.length === 0 ? (
          <p className="text-sm opacity-70">
            Chưa tìm thấy lá nào bị bệnh
            {diseaseFilter !== "all" ? " với loại bệnh này" : ""}.
          </p>
        ) : (
          <>
            <label className="form-control gap-1">
              <span className="text-sm font-semibold">
                Chọn lá ({diseasedLeaves.length} kết quả)
              </span>
              <select
                className="select select-bordered w-full"
                value={activeLeaf?.result_id ?? ""}
                onChange={(e) => setSelectedResultId(e.target.value)}
              >
                {diseasedLeaves.map((d, i) => (
                  <option key={d.result_id} value={d.result_id}>
                    {d.local_date} · {d.diary_name} · {d.predictions.length}{" "}
                    vùng bệnh (#{i + 1})
                  </option>
                ))}
              </select>
            </label>
            {activeLeaf && (
              <div className="flex flex-col gap-3">
                <DiseaseOverlay
                  key={activeLeaf.result_id}
                  src={convertFileSrc(activeLeaf.leaf_path)}
                  predictions={activeLeaf.predictions}
                  imageSize={activeLeaf.image}
                />
                <AdviceCards
                  predictions={activeLeaf.predictions}
                  nitrogen={
                    activeNitrogen === null ? null : Number(activeNitrogen)
                  }
                  seed={activeLeaf.result_id}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section className="card gap-3 bg-base-200 p-4">
        <h2 className="font-bold">Thống kê theo cây</h2>
        {perDiary.map((d) => (
          <article key={d.id} className="rounded-box bg-base-100 p-3">
            <h3 className="font-semibold">{d.name}</h3>
            <p className="mt-1 text-sm opacity-75">
              {d.notes} ngày ghi chép · {d.leaves} lá · {d.regions} vùng bệnh ·
              thiếu đạm TB {d.avgNitrogen}%
            </p>
          </article>
        ))}
      </section>
      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}
    </main>
  );
}
