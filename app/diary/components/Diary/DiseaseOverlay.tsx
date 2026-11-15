"use client";

import { useState } from "react";
import type { DiseasePrediction } from "@/app/lib/services/ai";
import { diseaseColor, diseaseName } from "@/app/lib/services/diseaseAdvice";

interface Props {
  src: string;
  predictions: DiseasePrediction[];
  imageSize?: { width: number; height: number };
  alt?: string;
}

/** Ảnh lá kèm khung nhận diện bệnh (Roboflow trả về tọa độ tâm x, y và width, height theo pixel). */
export default function DiseaseOverlay({ src, predictions, imageSize, alt = "Ảnh lá" }: Props) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [minConfidence, setMinConfidence] = useState(0);

  const size = imageSize ?? natural;
  const visible = predictions.filter((p) => p.confidence * 100 >= minConfidence);
  const legend = Array.from(new Set(visible.map((p) => p.class)));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full overflow-hidden rounded-box bg-base-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full"
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
        {showBoxes && size && size.width > 0 && size.height > 0 &&
          visible.map((p, index) => {
            const color = diseaseColor(p.class);
            return (
              <div
                key={`${p.class}-${index}`}
                className="pointer-events-none absolute border-2"
                style={{
                  borderColor: color,
                  left: `${((p.x - p.width / 2) / size.width) * 100}%`,
                  top: `${((p.y - p.height / 2) / size.height) * 100}%`,
                  width: `${(p.width / size.width) * 100}%`,
                  height: `${(p.height / size.height) * 100}%`,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
                }}
              >
                <span
                  className="absolute left-0 top-0 max-w-full truncate px-1 text-[10px] font-semibold leading-4 text-white"
                  style={{ backgroundColor: color }}
                >
                  {diseaseName(p.class).split(" (")[0]} {Math.round(p.confidence * 100)}%
                </span>
              </div>
            );
          })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} />
          <span>Hiện khung nhận diện ({visible.length}/{predictions.length})</span>
        </label>
        {predictions.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="opacity-70">Độ tin cậy từ {minConfidence}%</span>
            <input type="range" min={0} max={90} step={5} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))} className="range range-xs w-24" />
          </label>
        )}
      </div>

      {legend.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {legend.map((name) => (
            <span key={name} className="badge badge-sm gap-1 border-0 text-white" style={{ backgroundColor: diseaseColor(name) }}>
              {diseaseName(name)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
