import Database from "@tauri-apps/plugin-sql";
import { getToday, getYesterday } from "../utils";
import { analyzeLeaf } from "./ai";

export interface DiarySummary {
  id: string;
  diary_name: string;
  description: string | null;
  is_dead: number;
  allow_dead_notes: number;
  thumbnail_path: string | null;
  current_streak: number;
  longest_streak: number;
  last_active_date: number;
  created_at: number;
}
interface DiaryStreak { current_streak: number; longest_streak: number; last_active_date: number }
export interface DiaryNote {
  id: string; diary_id: string; thumbnail_path: string | null; thought: string | null;
  created_at: string; local_date: string;
}
export interface LeafRecord { id: string; note_id: string; file_path: string; nitrogen_deficiency: number }
export interface DiaryNoteDetails extends DiaryNote { leaves: LeafRecord[] }
let dbInstance: Database | null = null;
async function getDb(): Promise<Database> {
  if (!dbInstance) dbInstance = await Database.load("sqlite:rice_diary.sqlite");
  return dbInstance;
}

export async function loadDiaries(): Promise<DiarySummary[]> {
  const db = await getDb();
  return db.select<DiarySummary[]>(`SELECT id, diary_name, description, is_dead, allow_dead_notes, thumbnail_path, current_streak, longest_streak, last_active_date, created_at FROM diaries_table ORDER BY created_at DESC`);
}
export async function loadDiary(id: string): Promise<DiarySummary | null> {
  const db = await getDb();
  const rows = await db.select<DiarySummary[]>(`SELECT id, diary_name, description, is_dead, allow_dead_notes, thumbnail_path, current_streak, longest_streak, last_active_date, created_at FROM diaries_table WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ?? null;
}
export async function createDiary(name: string, thumbnailPath: string | null): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(`INSERT INTO diaries_table (id, diary_name, thumbnail_path, current_streak, longest_streak, last_active_date) VALUES ($1, $2, $3, 0, 0, 0)`, [id, name, thumbnailPath]);
  return id;
}
export async function updateDiary(id: string, values: { diary_name: string; description: string | null; thumbnail_path: string | null; is_dead: boolean; allow_dead_notes: boolean }): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE diaries_table SET diary_name = $1, description = $2, thumbnail_path = $3, is_dead = $4, allow_dead_notes = $5 WHERE id = $6`, [values.diary_name, values.description, values.thumbnail_path, values.is_dead ? 1 : 0, values.allow_dead_notes ? 1 : 0, id]);
}
export async function deleteDiary(id: string): Promise<void> {
  const db = await getDb();
  const diaries = await db.select<{ id: string }[]>("SELECT id FROM diaries_table WHERE id = $1", [id]);
  if (diaries.length === 0) throw new Error(`Không tìm thấy nhật ký: ${id}`);
  await db.execute(`DELETE FROM leaves WHERE note_id IN (SELECT id FROM diary_notes WHERE diary_id = $1)`, [id]);
  await db.execute("DELETE FROM diary_notes WHERE diary_id = $1", [id]);
  await db.execute("DELETE FROM diaries_table WHERE id = $1", [id]);
}
async function updateStreak(db: Database, diaryId: string, today: number): Promise<void> {
  const rows = await db.select<DiaryStreak[]>(`SELECT current_streak, longest_streak, last_active_date FROM diaries_table WHERE id = $1`, [diaryId]);
  const diary = rows[0];
  if (!diary) throw new Error(`Không tìm thấy nhật ký: ${diaryId}`);
  if (diary.last_active_date === today) return;
  const yesterday = getYesterday();
  const current = diary.last_active_date === yesterday ? diary.current_streak + 1 : 1;
  await db.execute(`UPDATE diaries_table SET current_streak = $1, longest_streak = $2, last_active_date = $3 WHERE id = $4`, [current, Math.max(diary.longest_streak, current), today, diaryId]);
}
export async function uploadNoteToDiary(diaryId: string, noteThumbnailPath: string | null, leafImgPaths: string[], thought: string | null = null): Promise<string> {
  const db = await getDb();
  const today = getToday();
  const diaryRows = await db.select<{ id: string; is_dead: number; allow_dead_notes: number }[]>("SELECT id, is_dead, allow_dead_notes FROM diaries_table WHERE id = $1", [diaryId]);
  const diary = diaryRows[0];
  if (!diary) throw new Error("Không tìm thấy nhật ký.");
  if (diary.is_dead && !diary.allow_dead_notes) throw new Error("Cây đã được đánh dấu đã chết; hãy bật chế độ cây xác sống trong cài đặt để tiếp tục ghi chú.");
  const existing = await db.select<{ id: string }[]>(`SELECT id FROM diary_notes WHERE diary_id = $1 AND date(created_at, '+7 hours') = date('now', '+7 hours') LIMIT 1`, [diaryId]);
  if (existing.length) throw new Error("Hôm nay nhật ký này đã có ghi chú.");

  // Analyze all images before writing note data, so an analysis failure does not leave a partial note.
  const scores = await Promise.all(leafImgPaths.map((image) => analyzeLeaf(image)));
  const noteId = crypto.randomUUID();
  await db.execute(`INSERT INTO diary_notes (id, diary_id, thumbnail_path, thought) VALUES ($1, $2, $3, $4)`, [noteId, diaryId, noteThumbnailPath, thought]);
  for (let index = 0; index < leafImgPaths.length; index += 1) {
    await db.execute(`INSERT INTO leaves (id, note_id, file_path, nitrogen_deficiency) VALUES ($1, $2, $3, $4)`, [crypto.randomUUID(), noteId, leafImgPaths[index], scores[index]]);
  }
  await updateStreak(db, diaryId, today);
  return noteId;
}
export async function loadDiaryNotes(diaryId: string): Promise<DiaryNote[]> {
  const db = await getDb();
  return db.select<DiaryNote[]>(`SELECT id, diary_id, thumbnail_path, thought, created_at, date(created_at, '+7 hours') AS local_date FROM diary_notes WHERE diary_id = $1 ORDER BY created_at DESC`, [diaryId]);
}
export async function loadDiaryNoteDetails(noteId: string): Promise<DiaryNoteDetails | null> {
  const db = await getDb();
  const notes = await db.select<DiaryNote[]>(`SELECT id, diary_id, thumbnail_path, thought, created_at, date(created_at, '+7 hours') AS local_date FROM diary_notes WHERE id = $1 LIMIT 1`, [noteId]);
  const note = notes[0];
  if (!note) return null;
  const leaves = await db.select<LeafRecord[]>("SELECT id, note_id, file_path, nitrogen_deficiency FROM leaves WHERE note_id = $1", [noteId]);
  return { ...note, leaves };
}
export async function hasNoteToday(diaryId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(`SELECT id FROM diary_notes WHERE diary_id = $1 AND date(created_at, '+7 hours') = date('now', '+7 hours') LIMIT 1`, [diaryId]);
  return rows.length > 0;
}
