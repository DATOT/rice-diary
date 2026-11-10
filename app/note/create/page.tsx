"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { NextPrevButtons } from "./components/NextPrevButtons";
import { LeafStep } from "./LeafStep";
import { ConfirmStep } from "./ConfirmStep";
import { ThumbnailStep } from "./ThumbnailStep";
import { useNoteCreation } from "@/app/contexts/NoteCreationContext";
import { uploadNoteToDiary } from "@/app/lib/services/database";
import SubmittingPage from "./SubmittingPage";

const STEPS = ["Hình đại diện", "Hình lá", "Xác nhận"];
const STEP_HASHES = ["avatar", "leaf", "confirm"];

const NoteCreateRoutePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParam = useSearchParams();
  const diaryId = searchParam.get("diary_id");

  // Consume state and actions from Context
  const { thumbnailPath, leafPaths, submitting, setSubmitting, resetForm } =
    useNoteCreation();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Sync hash changes (back/forward history clicks) into component state
  useEffect(() => {
    const handleHashSync = () => {
      const currentHash = window.location.hash.replace("#", "");
      const matchedIndex = STEP_HASHES.indexOf(currentHash);

      if (matchedIndex !== -1) {
        setStep(matchedIndex);
      } else {
        router.replace(
          `${pathname}?${searchParam.toString()}#${STEP_HASHES[0]}`,
        );
      }
    };

    handleHashSync();

    window.addEventListener("hashchange", handleHashSync);
    return () => window.removeEventListener("hashchange", handleHashSync);
  }, [pathname, searchParam, router]);

  // Derived validation state — computed during render, not in an effect
  const allowNext = (() => {
    if (step === 0) return Boolean(thumbnailPath);
    if (step === 1) return leafPaths.length > 0;
    return true;
  })();

  const handlePrev = () => {
    if (step > 0) {
      const nextIndex = step - 1;
      router.push(
        `${pathname}?${searchParam.toString()}#${STEP_HASHES[nextIndex]}`,
      );
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      const nextIndex = step + 1;
      router.push(
        `${pathname}?${searchParam.toString()}#${STEP_HASHES[nextIndex]}`,
      );
    } else {
      if (!diaryId) return;
      // Final confirmation button click trigger submission action routine
      setSubmitting(true);

      uploadNoteToDiary(diaryId, thumbnailPath, leafPaths).then();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4 pb-24">
      <ProgressBar step={step} />

      <div className="py-6 min-h-[250px] border border-base-300 rounded-box p-6 bg-base-100">
        {!submitting ? (
          step === 0 ? (
            <ThumbnailStep error={error} setError={setError} />
          ) : step === 1 ? (
            <LeafStep error={error} setError={setError} />
          ) : step === 2 ? (
            <ConfirmStep diaryId={diaryId} />
          ) : null
        ) : (
          <SubmittingPage />
        )}
      </div>

      <NextPrevButtons
        step={step}
        allowNext={allowNext}
        onPrevClick={handlePrev}
        onNextClick={handleNext}
      />
    </div>
  );
};

export default function SafeNoteCreateRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center font-semibold">Đang tải...</div>
      }
    >
      <NoteCreateRoutePage />
    </Suspense>
  );
}
