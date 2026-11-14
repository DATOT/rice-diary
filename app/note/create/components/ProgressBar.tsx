"use client";

const DEFAULT_STEPS = ["Hình đại diện", "Hình lá", "Suy nghĩ", "Xác nhận"];
export const ProgressBar = ({ step, steps = DEFAULT_STEPS }: { step: number; steps?: string[] }) => (
  <ul className="steps w-full my-4">{steps.map((description, idx) => <li className={`step ${idx <= step ? "step-primary" : ""}`} key={description}>{description}</li>)}</ul>
);
