"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { NextPrevButtons } from "./components/NextPrevButtons";
import { LeafStep } from "./LeafStep";
import { ConfirmStep } from "./ConfirmStep";
import { ThumbnailStep } from "./ThumbnailStep";
import { ThoughtStep } from "./ThoughtStep";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { uploadNoteToDiary } from "@/app/lib/services/database";
import SubmittingPage from "./SubmittingPage";

const STEPS = ["Hình đại diện", "Hình lá", "Suy nghĩ", "Xác nhận"];
const STEP_HASHES = ["avatar", "leaf", "thought", "confirm"];

const NoteCreateRoutePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParam = useSearchParams();
  const diaryId = searchParam.get("diary_id");
  const { thumbnailPath, leafPaths, thought, submitting, setSubmitting, resetForm } = useNoteCreation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const handleHashSync = () => {
      const currentHash = window.location.hash.replace("#", "");
      const matchedIndex = STEP_HASHES.indexOf(currentHash);
      if (matchedIndex !== -1) setStep(matchedIndex);
      else router.replace(`${pathname}?${searchParam.toString()}#${STEP_HASHES[0]}`);
    };
    handleHashSync();
    window.addEventListener("hashchange", handleHashSync);
    return () => window.removeEventListener("hashchange", handleHashSync);
  }, [pathname, searchParam, router]);

  const allowNext = step === 0 ? Boolean(thumbnailPath) : step === 1 ? leafPaths.length > 0 : true;
  const handlePrev = () => {
    if (step > 0) router.push(`${pathname}?${searchParam.toString()}#${STEP_HASHES[step - 1]}`);
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      router.push(`${pathname}?${searchParam.toString()}#${STEP_HASHES[step + 1]}`);
      return;
    }
    if (!diaryId || submitting) return;
    setSubmitting(true);
    try {
      await uploadNoteToDiary(diaryId, thumbnailPath, leafPaths, thought.trim() || null);
      resetForm();
      router.replace(`/diary?id=${encodeURIComponent(diaryId)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Không thể tạo ghi chú: ${message}`);
      setSubmitting(false);
      router.replace(`/diary?id=${encodeURIComponent(diaryId)}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4 pb-24">
      <ProgressBar step={step} steps={STEPS} />
      <div className="py-6 min-h-[250px] border border-base-300 rounded-box p-6 bg-base-100">
        {!submitting ? (
          step === 0 ? <ThumbnailStep /> :
          step === 1 ? <LeafStep /> :
          step === 2 ? <ThoughtStep /> :
          step === 3 ? <ConfirmStep diaryId={diaryId} /> : null
        ) : <SubmittingPage />}
      </div>
      <NextPrevButtons step={step} steps={STEPS} allowNext={allowNext} onPrevClick={handlePrev} onNextClick={handleNext} />
    </div>
  );
};

export default function SafeNoteCreateRoutePage() {
  return <Suspense fallback={<div className="p-10 text-center font-semibold">Đang tải...</div>}><NoteCreateRoutePage /></Suspense>;
}
