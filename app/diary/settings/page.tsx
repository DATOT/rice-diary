"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  deleteDiaryThumbnail,
  saveDiaryThumbnail,
} from "@/app/lib/services/diaryFiles";
import {
  loadDiary,
  updateDiary,
  type DiarySummary,
} from "@/app/lib/services/database";

function DiarySettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError("Thiếu mã nhật ký.");
      setLoading(false);
      return;
    }

    loadDiary(id)
      .then((value) => {
        if (!active) return;
        if (!value) {
          setError("Không tìm thấy nhật ký.");
          return;
        }

        setDiary(value);
        setName(value.diary_name);
        setDescription(value.description || "");
        setThumbnail(value.thumbnail_path);
        setIsDead(Boolean(value.is_dead));
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : String(reason)),
      )
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function selectThumbnail() {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: "Hình ảnh", extensions: ["png", "jpg", "jpeg", "webp"] },
        ],
      });

      if (typeof selected === "string") setThumbnail(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !diary || !name.trim()) return;

    setSaving(true);
    setError(null);

    let savedThumbnail: string | null = null;

    try {
      const thumbnailChanged = thumbnail !== diary.thumbnail_path;
      if (thumbnailChanged && thumbnail) {
        savedThumbnail = await saveDiaryThumbnail(thumbnail);
      }

      const nextThumbnail =
        savedThumbnail || (thumbnailChanged ? null : diary.thumbnail_path);

      await updateDiary(id, {
        diary_name: name.trim(),
        description: description.trim() || null,
        thumbnail_path: nextThumbnail,
        is_dead: isDead,
      });

      if (thumbnailChanged && diary.thumbnail_path) {
        await deleteDiaryThumbnail(diary.thumbnail_path);
      }

      router.replace(`/diary?id=${encodeURIComponent(id)}`);
    } catch (reason) {
      if (savedThumbnail) await deleteDiaryThumbnail(savedThumbnail);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4 pb-24">
      <div className="mb-5 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">
          Nhật ký
        </p>
        <h1 className="text-2xl font-black tracking-tight">Cài đặt nhật ký</h1>
      </div>

      {error && (
        <div className="alert alert-error mb-4 shadow-sm">
          <span>{error}</span>
        </div>
      )}

      {!diary ? (
        <button className="btn btn-primary" onClick={() => router.back()}>
          Quay lại
        </button>
      ) : (
        <form className="space-y-5" onSubmit={save}>
          <label className="form-control gap-2">
            <span className="label-text font-medium">Tên cây / nhật ký</span>
            <input
              className="input input-bordered w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label className="form-control gap-2">
            <span className="label-text font-medium">Mô tả (không bắt buộc)</span>
            <textarea
              className="textarea textarea-bordered min-h-24 w-full"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              placeholder="Thông tin về cây..."
            />
          </label>

          <div className="card border border-base-300 bg-base-200 p-4 shadow-sm">
            <h2 className="mb-3 text-base font-bold">Ảnh đại diện</h2>
            {thumbnail && (
              <img
                src={convertFileSrc(thumbnail)}
                alt="Ảnh đại diện nhật ký"
                className="mb-3 h-48 w-full rounded-box object-cover"
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={selectThumbnail}
              >
                Đổi ảnh
              </button>

              {thumbnail && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setThumbnail(null)}
                >
                  Bỏ ảnh
                </button>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-box border border-base-300 bg-base-200 p-4 shadow-sm">
            <input
              className="toggle toggle-error"
              type="checkbox"
              checked={isDead}
              onChange={(event) => setIsDead(event.target.checked)}
            />
            <span>
              <b className="block">Cây đã chết</b>
              <span className="mt-1 block text-sm opacity-70">
                Khi bật, việc tạo ghi chú mới sẽ bị khóa theo mặc định.
              </span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => router.back()}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              className="btn btn-primary flex-1"
              type="submit"
              disabled={saving || !name.trim()}
            >
              {saving ? <span className="loading loading-spinner" /> : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

export default function DiarySettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải...</div>}>
      <DiarySettingsContent />
    </Suspense>
  );
}
