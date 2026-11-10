import Database from "@tauri-apps/plugin-sql";
import { getToday, getYesterday } from "../utils";
import { analyzeLeaf } from "./ai";

export interface DiarySummary {
  id: string;
  diary_name: string;
  thumbnail_path: string | null;
  current_streak: number;
  longest_streak: number;
  last_active_date: number;
  created_at: number;
}

interface DiaryStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: number;
}
export interface DiaryNote {
  id: string;
  diary_id: string;
  thumbnail_path: string | null;
  created_at: string;
  local_date: string; // YYYY-MM-DD, Vietnam local date
}

export interface LeafRecord {
  id: string;
  note_id: string;
  file_path: string;
  nitrogen_deficiency: number;
}

export interface DiaryNoteDetails extends DiaryNote {
  leaves: LeafRecord[];
}
let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:rice_diary.sqlite");
  }

  return dbInstance;
}

// ------------------------------------
// Load diaries
// ------------------------------------

export async function loadDiaries(): Promise<DiarySummary[]> {
  const db = await getDb();

  return db.select<DiarySummary[]>(
    `SELECT
      id,
      diary_name,
      thumbnail_path,
      current_streak,
      longest_streak,
      last_active_date,
      created_at
    FROM diaries_table
    ORDER BY created_at DESC`,
  );
}

// ------------------------------------
// Load one diary
// ------------------------------------

export async function loadDiary(id: string): Promise<DiarySummary | null> {
  const db = await getDb();

  const rows = await db.select<DiarySummary[]>(
    `SELECT
      id,
      diary_name,
      thumbnail_path,
      current_streak,
      longest_streak,
      last_active_date,
      created_at
    FROM diaries_table
    WHERE id = $1
    LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

// ------------------------------------
// Create diary
// ------------------------------------

export async function createDiary(
  name: string,
  thumbnailPath: string | null,
): Promise<string> {
  const db = await getDb();

  const id = crypto.randomUUID();

  // A newly created diary has no activity yet.
  await db.execute(
    `INSERT INTO diaries_table (
      id,
      diary_name,
      thumbnail_path,
      current_streak,
      longest_streak,
      last_active_date
    )
    VALUES ($1, $2, $3, 0, 0, 0)`,
    [id, name, thumbnailPath],
  );

  return id;
}

// ------------------------------------
// Delete diary
// ------------------------------------

export async function deleteDiary(id: string): Promise<void> {
  const db = await getDb();

  // Your schema uses ON DELETE NO ACTION.
  // Delete children before deleting the parent.

  const diaries = await db.select<{ id: string }[]>(
    "SELECT id FROM diaries_table WHERE id = $1",
    [id],
  );

  if (diaries.length === 0) {
    throw new Error(`Diary not found: ${id}`);
  }

  await db.execute(
    `DELETE FROM leaves
     WHERE note_id IN (
       SELECT id FROM diary_notes WHERE diary_id = $1
     )`,
    [id],
  );

  await db.execute("DELETE FROM diary_notes WHERE diary_id = $1", [id]);

  await db.execute("DELETE FROM diaries_table WHERE id = $1", [id]);
}

// ------------------------------------
// Update streak
// ------------------------------------

async function updateStreak(
  db: Database,
  diaryId: string,
  today: number,
): Promise<void> {
  const rows = await db.select<DiaryStreak[]>(
    `SELECT
      current_streak,
      longest_streak,
      last_active_date
    FROM diaries_table
    WHERE id = $1`,
    [diaryId],
  );

  const diary = rows[0];

  if (!diary) {
    throw new Error(`Diary not found: ${diaryId}`);
  }

  // Already counted today.
  if (diary.last_active_date === today) {
    return;
  }

  const yesterday = getYesterday();

  const newCurrent =
    diary.last_active_date === yesterday ? diary.current_streak + 1 : 1;

  const newLongest = Math.max(diary.longest_streak, newCurrent);

  await db.execute(
    `UPDATE diaries_table
     SET
       current_streak = $1,
       longest_streak = $2,
       last_active_date = $3
     WHERE id = $4`,
    [newCurrent, newLongest, today, diaryId],
  );
}

// ------------------------------------
// Upload note to diary
// ------------------------------------

export async function uploadNoteToDiary(
  diaryId: string,
  noteThumbnailPath: string | null,
  leafImgPaths: string[],
): Promise<string> {
  const db = await getDb();

  const today = getToday();
  const noteId = crypto.randomUUID();

  const diaries = await db.select<{ id: string }[]>(
    "SELECT id FROM diaries_table WHERE id = $1",
    [diaryId],
  );

  if (diaries.length === 0) {
    throw new Error(`Diary not found: ${diaryId}`);
  }

  const existing = await db.select<{ id: string }[]>(
    `
    SELECT id
    FROM diary_notes
    WHERE diary_id = $1
      AND date(created_at, '+7 hours') = date('now', '+7 hours')
    LIMIT 1
    `,
    [diaryId],
  );

  if (existing.length > 0) {
    throw new Error("A note already exists for this diary today.");
  }

  await db.execute(
    `
    INSERT INTO diary_notes (
      id,
      diary_id,
      thumbnail_path
    )
    VALUES ($1, $2, $3)
    `,
    [noteId, diaryId, noteThumbnailPath],
  );

  for (const img of leafImgPaths) {
    const score = await analyzeLeaf(img);
    await db.execute(
      `
      INSERT INTO leaves (
        id,
        note_id,
        file_path,
        nitrogen_deficiency
      )
      VALUES ($1, $2, $3, $4)
      `,
      [crypto.randomUUID(), noteId, img, score],
    );
  }

  await updateStreak(db, diaryId, today);

  return noteId;
}
export async function loadDiaryNotes(diaryId: string): Promise<DiaryNote[]> {
  const db = await getDb();

  return db.select<DiaryNote[]>(
    `
    SELECT
      id,
      diary_id,
      thumbnail_path,
      created_at,
      date(created_at, '+7 hours') AS local_date
    FROM diary_notes
    WHERE diary_id = $1
    ORDER BY created_at DESC
    `,
    [diaryId],
  );
}

// ------------------------------------
// Load one note and its leaves
// ------------------------------------

export async function loadDiaryNoteDetails(
  noteId: string,
): Promise<DiaryNoteDetails | null> {
  const db = await getDb();

  const notes = await db.select<DiaryNote[]>(
    `
    SELECT
      id,
      diary_id,
      thumbnail_path,
      created_at,
      date(created_at, '+7 hours') AS local_date
    FROM diary_notes
    WHERE id = $1
    LIMIT 1
    `,
    [noteId],
  );

  const note = notes[0];

  if (!note) return null;

  const leaves = await db.select<LeafRecord[]>(
    `
    SELECT id, note_id, file_path, nitrogen_deficiency
    FROM leaves
    WHERE note_id = $1
    `,
    [noteId],
  );

  return {
    ...note,
    leaves,
  };
}

// ------------------------------------
// Check whether a note exists today
// ------------------------------------

export async function hasNoteToday(diaryId: string): Promise<boolean> {
  const db = await getDb();

  const rows = await db.select<{ id: string }[]>(
    `
    SELECT id
    FROM diary_notes
    WHERE diary_id = $1
      AND date(created_at, '+7 hours') = date('now', '+7 hours')
    LIMIT 1
    `,
    [diaryId],
  );

  return rows.length > 0;
}
