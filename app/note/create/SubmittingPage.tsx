"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export default function SubmittingPage() {
  return <div className="flex flex-col items-center justify-center gap-4 py-10"><span className="loading loading-spinner loading-lg text-primary" /><p className="font-semibold">Đang xử lý...</p><p className="text-sm opacity-60">Đang phân tích hình ảnh và lưu ghi chú của bạn.</p></div>;
}
