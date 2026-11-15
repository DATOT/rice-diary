"use client";

import { useEffect, useRef, useState } from "react";

import DiaryCard from "./components/DiarySel/DiaryCard";
import CreateDiaryModal from "./components/DiarySel/CreateDiaryModal";
import DeleteDiaryModal from "./components/DiarySel/DeleteDiaryModal";

import {
  type DiarySummary,
  loadDiaries,
  createDiary,
  deleteDiary,
} from "../lib/services/database";

import {
  saveDiaryThumbnail,
  deleteDiaryThumbnail,
} from "../lib/services/diaryFiles";

export default function DiarySelectPage() {
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [cards, setCards] = useState<DiarySummary[]>([]);
  const [cardToDelete, setCardToDelete] = useState<DiarySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshDiaries() {
    try {
      setError(null);
      const result = await loadDiaries();
      setCards(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách nhật ký.",
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const result = await loadDiaries();

        if (!cancelled) {
          setCards(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không thể tải nhật ký.",
          );
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateDiary(
    name: string,
    sourceThumbnailPath: string | null,
  ) {
    setLoading(true);
    setError(null);

    let savedThumbnailPath: string | null = null;

    try {
      if (sourceThumbnailPath) {
        savedThumbnailPath = await saveDiaryThumbnail(sourceThumbnailPath);
      }

      await createDiary(name, savedThumbnailPath);
      await refreshDiaries();
    } catch (err) {
      if (savedThumbnailPath) {
        await deleteDiaryThumbnail(savedThumbnailPath);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDelete(diary: DiarySummary) {
    setCardToDelete(diary);
    deleteDialogRef.current?.showModal();
  }

  async function handleDeleteDiary() {
    if (!cardToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await deleteDiary(cardToDelete.id);
      await deleteDiaryThumbnail(cardToDelete.thumbnail_path);
      deleteDialogRef.current?.close();
      setCardToDelete(null);
      await refreshDiaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa nhật ký.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 p-4 pb-24">
      <CreateDiaryModal
        dialogRef={createDialogRef}
        loading={loading}
        onCreate={handleCreateDiary}
      />

      <DeleteDiaryModal
        dialogRef={deleteDialogRef}
        diary={cardToDelete}
        loading={loading}
        onConfirm={handleDeleteDiary}
      />

      <div className="w-full max-w-xl space-y-3">
        <div className="rounded-box border border-base-300 bg-base-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            Quản lý
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Nhật ký của bạn</h1>
        </div>

        <button
          className="btn btn-primary w-full rounded-2xl"
          onClick={() => createDialogRef.current?.showModal()}
        >
          + Tạo nhật ký mới
        </button>
      </div>

      <div className="divider my-0 w-full max-w-xl" />

      {error && (
        <div className="alert alert-error w-full max-w-xl shadow-sm">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={refreshDiaries}>
            Thử lại
          </button>
        </div>
      )}

      {initialLoading ? (
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : cards.length === 0 ? (
        <div className="w-full max-w-xl rounded-box border border-dashed border-base-300 bg-base-200 p-8 text-center">
          <p className="text-lg font-semibold">Chưa có nhật ký nào</p>
          <p className="mt-2 text-sm opacity-70">Hãy tạo nhật ký đầu tiên của bạn.</p>
        </div>
      ) : (
        <div className="flex w-full max-w-xl flex-col items-center gap-4">
          {cards.map((card) => (
            <DiaryCard key={card.id} diary={card} onDelete={handleOpenDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
