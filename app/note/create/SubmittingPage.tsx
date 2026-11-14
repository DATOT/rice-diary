"use client";

import { useNoteCreation } from "@/app/contexts/NoteCreationContext";

export default function SubmittingPage() {
  const { phase, phaseMessage, leafPaths } = useNoteCreation();
  const steps = [
    { id: "saving", label: "Lưu nhật ký", description: "Đang lưu ảnh và suy nghĩ của bạn." },
    { id: "leaves", label: "Phân tích lá", description: `Đang phân tích ${leafPaths.length} ảnh lá bằng mô hình trên thiết bị.` },
    { id: "diseases", label: "Tìm dấu hiệu bệnh", description: "Đang kiểm tra các dấu hiệu bệnh qua kết nối mạng." },
  ];
  const current = steps.findIndex((step) => step.id === phase);
  return <section aria-live="polite" className="mx-auto flex max-w-md flex-col gap-5 py-5">
    <div className="text-center"><span className="loading loading-spinner loading-lg text-primary" /><h2 className="mt-3 text-xl font-bold">Đang tạo nhật ký</h2><p className="mt-1 text-sm opacity-70">Vui lòng đợi trong giây lát, đừng đóng ứng dụng.</p></div>
    <ol className="steps steps-vertical w-full">
      {steps.map((step, index) => <li key={step.id} className={`step ${index <= current ? "step-primary" : ""}`}>
        <div className="w-full rounded-box bg-base-200 p-3 text-left"><b>{step.label}</b><p className="text-sm opacity-70">{step.description}</p></div>
      </li>)}
    </ol>
    {phaseMessage && <p role="status" className="rounded-box bg-base-200 p-3 text-center text-sm">{phaseMessage}</p>}
  </section>;
}
