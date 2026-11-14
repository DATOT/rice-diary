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
import { analyzeNoteForDiseases } from "@/app/lib/services/insights";
import SubmittingPage from "./SubmittingPage";

const STEPS = ["Hình đại diện", "Hình lá", "Suy nghĩ", "Xác nhận"];
const STEP_HASHES = ["avatar", "leaf", "thought", "confirm"];
const NoteCreateRoutePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParam = useSearchParams();
  const diaryId = searchParam.get("diary_id");
  const { thumbnailPath, leafPaths, thought, submitting, setSubmitting, setPhase, setPhaseMessage, resetForm } = useNoteCreation();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const sync = () => {
      const index = STEP_HASHES.indexOf(window.location.hash.replace("#", ""));
      if (index >= 0) setStep(index);
      else router.replace(`${pathname}?${searchParam.toString()}#${STEP_HASHES[0]}`);
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname, searchParam, router]);
  const allowNext = step === 0 ? Boolean(thumbnailPath) : step === 1 ? leafPaths.length > 0 : true;
  const handlePrev = () => { if (step > 0) router.push(`${pathname}?${searchParam.toString()}#${STEP_HASHES[step - 1]}`); };
  const handleNext = async () => {
    if (step < STEPS.length - 1) { router.push(`${pathname}?${searchParam.toString()}#${STEP_HASHES[step + 1]}`); return; }
    if (!diaryId || submitting) return;
    setSubmitting(true); setPhase("saving"); setPhaseMessage("Đang lưu thông tin nhật ký…");
    try {
      setPhase("leaves"); setPhaseMessage(`Đang phân tích ${leafPaths.length} ảnh lá trên thiết bị…`);
      const noteId = await uploadNoteToDiary(diaryId, thumbnailPath, leafPaths, thought.trim() || null);
      setPhase("diseases");
      await analyzeNoteForDiseases(noteId, leafPaths, setPhaseMessage);
      resetForm(); router.replace(`/diary?id=${encodeURIComponent(diaryId)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Không thể tạo ghi chú: ${message}`);
      setSubmitting(false); setPhase("idle"); setPhaseMessage("");
      router.replace(`/diary?id=${encodeURIComponent(diaryId)}`);
    }
  };
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-28">
    <ProgressBar step={step} steps={STEPS} />
    <div className="min-h-[250px] rounded-box border border-base-300 bg-base-100 p-5 sm:p-6">
      {!submitting ? step === 0 ? <ThumbnailStep /> : step === 1 ? <LeafStep /> : step === 2 ? <ThoughtStep /> : step === 3 ? <ConfirmStep diaryId={diaryId} /> : null : <SubmittingPage />}
    </div>
    <NextPrevButtons step={step} steps={STEPS} allowNext={allowNext} onPrevClick={handlePrev} onNextClick={handleNext} />
  </div>;
};
export default function SafeNoteCreateRoutePage() {
  return <Suspense fallback={<div className="p-10 text-center font-semibold">Đang tải…</div>}><NoteCreateRoutePage /></Suspense>;
}
