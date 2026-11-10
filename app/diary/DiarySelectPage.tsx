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

  // ------------------------------------
  // Load diaries
  // ------------------------------------

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

  // ------------------------------------
  // Create diary
  // ------------------------------------

  async function handleCreateDiary(
    name: string,
    sourceThumbnailPath: string | null,
  ) {
    setLoading(true);
    setError(null);

    let savedThumbnailPath: string | null = null;

    try {
      // Copy the selected image into persistent app storage.
      if (sourceThumbnailPath) {
        savedThumbnailPath = await saveDiaryThumbnail(sourceThumbnailPath);
      }

      await createDiary(name, savedThumbnailPath);

      await refreshDiaries();
    } catch (err) {
      // Prevent orphaned thumbnail files if database insertion fails.
      if (savedThumbnailPath) {
        await deleteDiaryThumbnail(savedThumbnailPath);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------
  // Open delete dialog
  // ------------------------------------

  function handleOpenDelete(diary: DiarySummary) {
    setCardToDelete(diary);
    deleteDialogRef.current?.showModal();
  }

  // ------------------------------------
  // Delete diary
  // ------------------------------------

  async function handleDeleteDiary() {
    if (!cardToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await deleteDiary(cardToDelete.id);

      // Delete thumbnail after successful database deletion.
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

  // ------------------------------------
  // Render
  // ------------------------------------

  return (
    <div className="w-full p-4 flex flex-col gap-4 items-center pb-24">
      {/* Create modal */}

      <CreateDiaryModal
        dialogRef={createDialogRef}
        loading={loading}
        onCreate={handleCreateDiary}
      />

      {/* Delete modal */}

      <DeleteDiaryModal
        dialogRef={deleteDialogRef}
        diary={cardToDelete}
        loading={loading}
        onConfirm={handleDeleteDiary}
      />

      {/* Header */}

      <h1 className="font-black">Tạo nhật ký mới</h1>

      <button
        className="btn btn-primary w-full"
        onClick={() => createDialogRef.current?.showModal()}
      >
        +
      </button>

      <div className="divider" />

      <h1 className="font-black">Các nhật ký của bạn</h1>

      {/* Error */}

      {error && (
        <div className="alert alert-error w-full">
          <span>{error}</span>
          <button className="btn btn-sm" onClick={refreshDiaries}>
            Thử lại
          </button>
        </div>
      )}

      {/* Loading */}

      {initialLoading ? (
        <div className="flex justify-center p-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center opacity-60 p-8">
          <p className="text-lg font-semibold">Chưa có nhật ký nào</p>
          <p className="text-sm">Hãy tạo nhật ký đầu tiên của bạn!</p>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4">
          {cards.map((card) => (
            <DiaryCard key={card.id} diary={card} onDelete={handleOpenDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
