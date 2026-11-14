"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export const NextPrevButtons = ({ step, steps, allowNext, onPrevClick, onNextClick }: {
  step: number; steps: string[]; allowNext: boolean; onPrevClick: () => void; onNextClick: () => void | Promise<void>;
}) => {
  const { submitting } = useNoteCreation();
  if (submitting) return null;
  return <div className="w-full flex justify-between gap-4 mt-6">
    {step > 0 ? <button className="btn btn-outline" onClick={onPrevClick}>Quay lại</button> : <div />}
    <button className="btn btn-primary ml-auto" disabled={!allowNext} onClick={() => void onNextClick()}>
      {step === steps.length - 1 ? "Xác nhận & Tạo" : "Tiếp theo"}
    </button>
  </div>;
};
