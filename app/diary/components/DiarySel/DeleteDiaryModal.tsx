"use client";

import type { RefObject } from "react";
import type { DiarySummary } from "@/app/lib/services/database";

interface DeleteDiaryModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  diary: DiarySummary | null;
  loading: boolean;
  onConfirm: () => void;
}

export default function DeleteDiaryModal({
  dialogRef,
  diary,
  loading,
  onConfirm,
}: DeleteDiaryModalProps) {
  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box border border-base-300 bg-base-100 shadow-xl">
        <h3 className="text-lg font-bold text-error">
          Xóa nhật ký: &quot;{diary?.diary_name}&quot;
        </h3>

        <p className="py-4 text-base-content/80">
          Nhật ký &quot;{diary?.diary_name}&quot; sẽ bị xóa vĩnh viễn. Bạn chắc
          không?
        </p>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => dialogRef.current?.close()}
          >
            Hủy
          </button>

          <button
            className="btn btn-error"
            disabled={loading || !diary}
            onClick={onConfirm}
          >
            {loading ? <span className="loading loading-spinner" /> : "Xóa"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
