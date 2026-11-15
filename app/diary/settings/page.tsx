"use client";

import { useEffect, useState } from "react";
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
  const [allowDeadNotes, setAllowDeadNotes] = useState(false);
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
        setAllowDeadNotes(Boolean(value.allow_dead_notes));
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
      if (thumbnailChanged && thumbnail)
        savedThumbnail = await saveDiaryThumbnail(thumbnail);
      const nextThumbnail =
        savedThumbnail || (thumbnailChanged ? null : diary.thumbnail_path);
      await updateDiary(id, {
        diary_name: name.trim(),
        description: description.trim() || null,
        thumbnail_path: nextThumbnail,
        is_dead: isDead,
        allow_dead_notes: allowDeadNotes,
      });
      if (thumbnailChanged && diary.thumbnail_path)
        await deleteDiaryThumbnail(diary.thumbnail_path);
      router.replace(`/diary?id=${encodeURIComponent(id)}`);
    } catch (reason) {
      if (savedThumbnail) await deleteDiaryThumbnail(savedThumbnail);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <div className="p-8 text-center">
        <span className="loading loading-spinner" />
      </div>
    );
  return (
    <main className="max-w-xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-black mb-5">Cài đặt nhật ký</h1>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      {!diary ? (
        <button className="btn" onClick={() => router.back()}>
          Quay lại
        </button>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={save}>
          <label className="form-control">
            <span className="label-text mb-2">Tên cây / nhật ký</span>
            <input
              className="input input-bordered"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-2">Mô tả (không bắt buộc)</span>
            <textarea
              className="textarea textarea-bordered min-h-24"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              placeholder="Thông tin về cây..."
            />
          </label>
          <div className="card bg-base-200 p-4 gap-3">
            <h2 className="font-bold">Ảnh đại diện</h2>
            {thumbnail && (
              <img
                src={convertFileSrc(thumbnail)}
                alt="Ảnh đại diện nhật ký"
                className="w-full h-48 rounded-box object-cover"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
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
          <label className="flex gap-3 items-center p-4 rounded-box bg-base-200">
            <input
              className="toggle toggle-error"
              type="checkbox"
              checked={isDead}
              onChange={(event) => setIsDead(event.target.checked)}
            />
            <span>
              <b>Cây đã chết</b>
              <span className="block text-sm opacity-70">
                Khi bật, việc tạo ghi chú mới sẽ bị khóa theo mặc định.
              </span>
            </span>
          </label>
          {/*
              TODO: remove on database, keep now for prototype
          isDead && (
            <label className="flex gap-3 items-center p-4 rounded-box border border-base-300">
              <input
                className="checkbox checkbox-primary"
                type="checkbox"
                checked={allowDeadNotes}
                onChange={(event) => setAllowDeadNotes(event.target.checked)}
              />
              <span>
                <b>Cho phép ghi chú (chế độ cây xác sống)</b>
                <span className="block text-sm opacity-70">
                  Cho phép tiếp tục theo dõi cây đã chết.
                </span>
              </span>
            </label>
          )*/}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn flex-1"
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
              {saving ? (
                <span className="loading loading-spinner" />
              ) : (
                "Lưu thay đổi"
              )}
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
import { Suspense } from "react";
