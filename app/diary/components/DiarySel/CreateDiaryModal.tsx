"use client";

import { useState, type RefObject } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import StreakIcon from "@/app/components/StreakIcon";

interface CreateDiaryModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  loading: boolean;
  onCreate: (name: string, thumbnailPath: string | null) => Promise<void>;
}

export default function CreateDiaryModal({
  dialogRef,
  loading,
  onCreate,
}: CreateDiaryModalProps) {
  const [name, setName] = useState("");
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setThumbnailPath(null);
    setError(null);
  }

  async function selectThumbnail() {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (selected) {
        setThumbnailPath(selected);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên nhật ký.");
      return;
    }

    setError(null);

    try {
      await onCreate(trimmedName, thumbnailPath);
      resetForm();
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo nhật ký.");
    }
  }

  function handleCancel() {
    resetForm();
    dialogRef.current?.close();
  }

  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box border border-base-300 bg-base-100 shadow-xl">
        <h3 className="text-lg font-bold">Tạo nhật ký mới</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="diary_name">
              <span className="label-text">Tên nhật ký</span>
            </label>
            <input
              type="text"
              id="diary_name"
              className="input input-bordered w-full"
              placeholder="Tên nhật ký"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Hình đại diện (không bắt buộc)</span>
            </label>

            <button
              type="button"
              className="btn btn-outline btn-primary w-full"
              onClick={selectThumbnail}
              disabled={loading}
            >
              Chọn hình ảnh
            </button>

            {thumbnailPath && (
              <p className="mt-2 break-all text-xs opacity-60">
                {thumbnailPath.split(/[\\/]/).pop()}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Xem trước</span>
            </label>

            <div className="flex w-full items-center justify-center">
              <div className="card w-[90%] overflow-hidden border border-base-300 bg-base-200">
                <figure>
                  <img
                    src={thumbnailPath ? convertFileSrc(thumbnailPath) : "/image.jfif"}
                    alt="Diary preview"
                    className="h-40 w-full object-cover"
                  />
                </figure>

                <div className="card-body p-4">
                  <StreakIcon
                    streak={false}
                    size="16pt"
                    className="absolute right-3 top-3 z-10"
                  />
                  <h3 className="card-title text-base">
                    {name.trim() || "Tên nhật ký"}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading ? <span className="loading loading-spinner" /> : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
