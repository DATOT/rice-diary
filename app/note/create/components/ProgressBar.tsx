"use client";

const STEPS = ["Hình đại diện", "Hình lá", "Xác nhận"];

export const ProgressBar = ({ step }: { step: number }) => {
  return (
    <ul className="steps w-full my-4">
      {STEPS.map((stepDescription, idx) => (
        <li className={`step ${idx <= step ? "step-primary" : ""}`} key={idx}>
          {stepDescription}
        </li>
      ))}
    </ul>
  );
};
