"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

const STEPS = ["Hình đại diện", "Hình lá", "Xác nhận"];

export const NextPrevButtons = ({
  step,
  allowNext,
  onPrevClick,
  onNextClick,
}: {
  step: number;
  allowNext: boolean;
  onPrevClick: () => void;
  onNextClick: () => void;
}) => {
  const { submitting } = useNoteCreation();
  if (submitting) {
    return <></>;
  }
  return (
    <div className="w-full flex justify-between gap-4 mt-6">
      {step !== 0 ? (
        <button className="btn btn-outline" onClick={onPrevClick}>
          Trước Đó
        </button>
      ) : (
        <div /> /* Visual placeholder to keep Next button aligned right */
      )}

      <button
        className="btn btn-primary ml-auto"
        disabled={!allowNext || submitting}
        onClick={onNextClick}
      >
        {step === STEPS.length - 1 ? "Xác nhận & Tạo" : "Tiếp Theo"}
      </button>
    </div>
  );
};
