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
        const url = convertFileSrc(selected);

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
      console.log(err);
      setError(err instanceof Error ? err.message : "Không thể tạo nhật ký.");
    }
  }

  function handleCancel() {
    resetForm();
    dialogRef.current?.close();
  }

  console.log(thumbnailPath ? convertFileSrc(thumbnailPath) : "/image.jfif"); // did work
  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Tạo nhật ký mới</h3>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="label" htmlFor="diary_name">
                Tên nhật ký
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
              <label className="label">Hình đại diện (không bắt buộc)</label>

              <button
                type="button"
                className="btn btn-accent w-full"
                onClick={selectThumbnail}
                disabled={loading}
              >
                Chọn hình ảnh
              </button>

              {thumbnailPath && (
                <p className="text-xs opacity-60 mt-2 break-all">
                  {thumbnailPath.split(/[\\/]/).pop()}
                </p>
              )}
            </div>

            <div>
              <label className="label">Xem trước</label>

              <div className="flex w-full items-center justify-center">
                <div className="card bg-base-300 image-full w-[90%]">
                  <figure>
                    <img
                      src={
                        thumbnailPath
                          ? convertFileSrc(thumbnailPath)
                          : "/image.jfif"
                      }
                      alt="Diary preview"
                      className="w-full h-40 object-cover"
                    />
                  </figure>

                  <div className="card-body p-4">
                    <StreakIcon
                      streak={false}
                      size="16pt"
                      className="absolute top-3 right-3 z-10"
                    />

                    <h3 className="card-title text-base">
                      {name.trim() || "Tên nhật ký"}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-error text-sm">{error}</div>}
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn"
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
