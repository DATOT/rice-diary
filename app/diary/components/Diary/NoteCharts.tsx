"use client";

import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LeafRecord } from "@/app/lib/services/database";
import type {
  ChartRow,
  DiseaseLeaf,
  ParsedDetection,
} from "@/app/lib/services/insights";
import {
  diseaseColor,
  diseaseKey,
  diseaseName,
  nitrogenLevel,
} from "@/app/lib/services/diseaseAdvice";

export function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: string;
}) {
  return (
    <section className="card h-52 w-full gap-3 border border-base-300 bg-base-200 p-4 shadow-sm sm:p-5">
      <h3 className="font-bold">{title}</h3>
      {empty ? (
        <p className="h-full w-full text-sm text-base-content/70">{empty}</p>
      ) : (
        <div className="h-full w-full sm:h-60">{children}</div>
      )}
    </section>
  );
}

const STATUS_COLORS = {
  healthy: "var(--color-success)",
  diseased: "var(--color-error)",
  unknown: "var(--color-base-content)",
};

const axisTick = { fill: "var(--color-base-content)", fontSize: 11 };
const gridStroke = "var(--color-base-300)";
const tooltipStyle = {
  backgroundColor: "var(--color-base-100)",
  border: "1px solid var(--color-base-300)",
  borderRadius: "var(--radius-box)",
  color: "var(--color-base-content)",
};

function countByClass(predictions: { class: string }[]) {
  const counts = new Map<string, number>();
  for (const p of predictions) {
    const key = diseaseKey(p.class);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([key, count]) => ({
    key,
    name: diseaseName(key),
    count,
    color: diseaseColor(key),
  })).sort((a, b) => b.count - a.count);
}

function DiseasePie({
  data,
}: {
  data: { name: string; count: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={2}
          label={({ value }) => String(value)}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "var(--color-base-content)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ---------- Biểu đồ cho MỘT ghi chú ---------- */
export function NoteCharts({
  leaves,
  detections,
}: {
  leaves: LeafRecord[];
  detections: ParsedDetection[];
}) {
  const nitrogenData = useMemo(
    () =>
      leaves.map((leaf, index) => {
        const value = Number(leaf.nitrogen_deficiency);
        return {
          name: `Lá ${index + 1}`,
          value,
          color: nitrogenLevel(value).color,
        };
      }),
    [leaves],
  );

  const statusData = useMemo(() => {
    const byPath = new Map(
      detections
        .filter((d) => d.status === "complete")
        .map((d) => [d.leaf_path, d]),
    );
    let healthy = 0,
      diseased = 0,
      unknown = 0;
    for (const leaf of leaves) {
      const found = byPath.get(leaf.file_path);
      if (!found) unknown += 1;
      else if (found.predictions.length) diseased += 1;
      else healthy += 1;
    }
    return [
      { name: "Không bệnh", count: healthy, color: STATUS_COLORS.healthy },
      { name: "Có bệnh", count: diseased, color: STATUS_COLORS.diseased },
      { name: "Chưa nhận diện", count: unknown, color: STATUS_COLORS.unknown },
    ].filter((item) => item.count > 0);
  }, [leaves, detections]);

  const diseaseData = useMemo(
    () => countByClass(detections.flatMap((d) => d.predictions)),
    [detections],
  );

  const perLeafDisease = useMemo(
    () =>
      leaves.map((leaf, index) => {
        const found = detections.find(
          (d) => d.leaf_path === leaf.file_path && d.status === "complete",
        );
        return {
          name: `Lá ${index + 1}`,
          regions: found ? found.predictions.length : 0,
        };
      }),
    [leaves, detections],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChartCard
        title="Thiếu hụt đạm theo từng lá (%)"
        empty={nitrogenData.length ? undefined : "Ghi chú này chưa có lá nào."}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={nitrogenData}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ ...axisTick, fontSize: 11 }}
              stroke={gridStroke}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ ...axisTick, fontSize: 11 }}
              stroke={gridStroke}
            />
            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(1)}%`,
                "Thiếu đạm",
              ]}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" name="Thiếu đạm" radius={[6, 6, 0, 0]}>
              {nitrogenData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Tình trạng các lá"
        empty={statusData.length ? undefined : "Chưa có dữ liệu."}
      >
        <DiseasePie data={statusData} />
      </ChartCard>

      <ChartCard
        title="Số vùng bệnh trên mỗi lá"
        empty={
          detections.some((d) => d.status === "complete")
            ? undefined
            : "Chưa nhận diện bệnh cho ghi chú này."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={perLeafDisease}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ ...axisTick, fontSize: 11 }}
              stroke={gridStroke}
            />
            <YAxis allowDecimals={false} tick={axisTick} stroke={gridStroke} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="regions"
              name="Số vùng bệnh"
              fill="var(--color-error)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Loại bệnh được nhận diện"
        empty={
          diseaseData.length ? undefined : "Không phát hiện vùng bệnh nào."
        }
      >
        <DiseasePie data={diseaseData} />
      </ChartCard>
    </div>
  );
}

/* ---------- Biểu đồ cho một KHOẢNG ngày ---------- */
export function RangeCharts({
  rows,
  diseaseLeaves,
}: {
  rows: ChartRow[];
  diseaseLeaves: DiseaseLeaf[];
}) {
  const daily = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        nitrogenSum: number;
        nitrogenN: number;
        leaves: number;
        diseases: number;
      }
    >();
    for (const row of rows) {
      if (!row.note_id) continue;
      const entry = map.get(row.local_date) ?? {
        date: row.local_date,
        nitrogenSum: 0,
        nitrogenN: 0,
        leaves: 0,
        diseases: 0,
      };
      entry.leaves += row.leaf_count;
      if (row.avg_nitrogen !== null) {
        entry.nitrogenSum += row.avg_nitrogen;
        entry.nitrogenN += 1;
      }
      map.set(row.local_date, entry);
    }
    for (const leaf of diseaseLeaves) {
      const entry = map.get(leaf.local_date);
      if (entry) entry.diseases += leaf.predictions.length;
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        nitrogen: e.nitrogenN
          ? Number((e.nitrogenSum / e.nitrogenN).toFixed(1))
          : null,
        leaves: e.leaves,
        diseases: e.diseases,
      }));
  }, [rows, diseaseLeaves]);

  const diseaseData = useMemo(
    () => countByClass(diseaseLeaves.flatMap((d) => d.predictions)),
    [diseaseLeaves],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChartCard
        title="Xu hướng thiếu hụt đạm (%)"
        empty={
          daily.some((d) => d.nitrogen !== null)
            ? undefined
            : "Chưa có dữ liệu đạm."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={daily}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ ...axisTick, fontSize: 10 }}
              stroke={gridStroke}
            />
            <YAxis domain={[0, 100]} tick={axisTick} stroke={gridStroke} />
            <Tooltip
              formatter={(value) => [`${value}%`, "Thiếu đạm TB"]}
              contentStyle={tooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="nitrogen"
              name="Thiếu đạm TB"
              stroke="var(--color-success)"
              fill="var(--color-success)"
              fillOpacity={0.25}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Số lá và vùng bệnh theo ngày"
        empty={daily.length ? undefined : "Chưa có dữ liệu."}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={daily}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ ...axisTick, fontSize: 10 }}
              stroke={gridStroke}
            />
            <YAxis allowDecimals={false} tick={axisTick} stroke={gridStroke} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                color: "var(--color-base-content)",
              }}
            />
            <Bar
              dataKey="leaves"
              name="Số lá"
              fill="var(--color-info)"
              radius={[6, 6, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="diseases"
              name="Vùng bệnh"
              stroke="var(--color-error)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Tỷ lệ các loại bệnh"
        empty={
          diseaseData.length
            ? undefined
            : "Chưa có kết quả nhận diện bệnh trong khoảng này."
        }
      >
        <DiseasePie data={diseaseData} />
      </ChartCard>
    </div>
  );
}
