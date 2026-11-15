"use client";

import { useMemo, useState } from "react";
import type { DiseasePrediction } from "@/app/lib/services/ai";
import { diseaseKey, getDiseaseInfo, getDiseaseTips, getNitrogenAdvice, type Tip } from "@/app/lib/services/diseaseAdvice";

interface Props {
  predictions: DiseasePrediction[];
  /** Điểm thiếu hụt đạm (%), null nếu chưa có. */
  nitrogen: number | null;
  /** Dùng để gợi ý ổn định giữa các lần render (ví dụ id ghi chú / id l��). */
  seed: string;
}

const GROUP_BADGE: Record<Tip["group"], string> = {
  "Canh tác": "badge-success",
  "Phân bón": "badge-warning",
  "Thuốc BVTV": "badge-error",
  "Theo dõi": "badge-info",
};

const NITROGEN_BADGE = {
  low: "badge-success",
  medium: "badge-warning",
  high: "badge-error",
} as const;

function TipList({ tips }: { tips: Tip[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {tips.map((tip) => (
        <li key={`${tip.group}-${tip.text}`} className="flex items-start gap-2 text-sm">
          <span className={`badge badge-sm mt-0.5 shrink-0 ${GROUP_BADGE[tip.group]}`}>{tip.group}</span>
          <span>{tip.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdviceCards({ predictions, nitrogen, seed }: Props) {
  const [round, setRound] = useState(0);

  const groups = useMemo(() => {
    const map = new Map<string, { raw: string; count: number; confidenceSum: number }>();
    for (const p of predictions) {
      const key = diseaseKey(p.class);
      const entry = map.get(key) ?? { raw: p.class, count: 0, confidenceSum: 0 };
      entry.count += 1;
      entry.confidenceSum += p.confidence;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [predictions]);

  const hasDisease = groups.length > 0;
  const nitrogenAdvice = nitrogen !== null && Number.isFinite(nitrogen) ? getNitrogenAdvice(nitrogen, `${seed}:${round}`, hasDisease) : null;

  if (!hasDisease && !nitrogenAdvice) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">Gợi ý xử lý</h3>
        <button type="button" className="btn btn-sm btn-ghost min-h-10 border border-base-300" onClick={() => setRound((value) => value + 1)}>
          Gợi ý khác
        </button>
      </div>

      {groups.map((group) => {
        const info = getDiseaseInfo(group.raw);
        return (
          <article key={info.key} className="card gap-2 border-l-4 border-base-300 bg-base-200 p-4" style={{ borderLeftColor: info.color }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold">{info.name}</h4>
              <span className="text-xs text-base-content/70">
                {group.count} vùng · độ tin cậy TB {Math.round((group.confidenceSum / group.count) * 100)}%
              </span>
            </div>
            <p className="text-sm text-base-content/80"><span className="font-semibold">Dấu hiệu:</span> {info.symptoms}</p>
            <p className="text-sm text-base-content/80"><span className="font-semibold">Nguyên nhân:</span> {info.cause}</p>
            <TipList tips={getDiseaseTips(group.raw, `${seed}:${round}`, 4)} />
          </article>
        );
      })}

      {nitrogenAdvice && (
        <article className="card gap-2 border-l-4 border-base-300 bg-base-200 p-4" style={{ borderLeftColor: nitrogenAdvice.level.color }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold">Thiếu hụt đạm (Nitrogen)</h4>
            <span className={`badge ${NITROGEN_BADGE[nitrogenAdvice.level.key]}`}>
              {nitrogenAdvice.level.label} · {Number(nitrogen).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-base-content/80">{nitrogenAdvice.summary}</p>
          {nitrogenAdvice.warning && <div className="alert alert-warning py-2 text-sm">{nitrogenAdvice.warning}</div>}
          <TipList tips={nitrogenAdvice.tips} />
        </article>
      )}

      <p className="text-xs text-base-content/60">
        Gợi ý mang tính tham khảo. Với thuốc bảo vệ thực vật, hãy đọc kỹ nhãn và hỏi cán bộ khuyến nông địa phương trước khi sử dụng.
      </p>
    </section>
  );
}
