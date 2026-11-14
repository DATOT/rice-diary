import Database from "@tauri-apps/plugin-sql";
import { detectDiseases, type DiseaseDetectionResult } from "./ai";

export type AppSettings = {
  theme: string;
  streakEnabled: boolean;
  streakFrequencyHours: number;
  tipsEnabled: boolean;
  reminderTime: string;
};

export type DiseaseResultRecord = {
  id: string;
  note_id: string;
  leaf_path: string;
  status: "complete" | "offline" | "failed";
  result_json: string | null;
  error: string | null;
  created_at: string;
};

export type ChartRow = {
  diary_id: string;
  diary_name: string;
  note_id: string;
  local_date: string;
  leaf_count: number;
  avg_nitrogen: number | null;
  disease_count: number;
  disease_names: string | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  streakEnabled: true,
  streakFrequencyHours: 24,
  tipsEnabled: false,
  reminderTime: "09:00",
};

let database: Promise<Database> | null = null;
async function getDatabase() {
  database ??= Database.load("sqlite:rice_diary.sqlite");
  return database;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM app_settings");
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return {
    theme: values.theme || DEFAULT_SETTINGS.theme,
    streakEnabled: values.streakEnabled === undefined ? DEFAULT_SETTINGS.streakEnabled : values.streakEnabled === "true",
    streakFrequencyHours: Math.max(1, Math.min(168, Number(values.streakFrequencyHours) || DEFAULT_SETTINGS.streakFrequencyHours)),
    tipsEnabled: values.tipsEnabled === undefined ? DEFAULT_SETTINGS.tipsEnabled : values.tipsEnabled === "true",
    reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(values.reminderTime || "") ? values.reminderTime : DEFAULT_SETTINGS.reminderTime,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  for (const [key, value] of Object.entries(settings)) {
    await db.execute("INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(value)]);
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("rice-diary-settings-changed"));
}

export async function saveDiseaseResult(noteId: string, leafPath: string, status: DiseaseResultRecord["status"], result: DiseaseDetectionResult | null, error: string | null = null) {
  const db = await getDatabase();
  await db.execute("INSERT INTO disease_detection_results (id, note_id, leaf_path, status, result_json, error) VALUES ($1, $2, $3, $4, $5, $6)", [crypto.randomUUID(), noteId, leafPath, status, result ? JSON.stringify(result) : null, error]);
}

export async function loadDiseaseResults(noteId: string): Promise<DiseaseResultRecord[]> {
  const db = await getDatabase();
  return db.select<DiseaseResultRecord[]>("SELECT id, note_id, leaf_path, status, result_json, error, created_at FROM disease_detection_results WHERE note_id = $1 ORDER BY created_at", [noteId]);
}

export async function loadChartRows(): Promise<ChartRow[]> {
  const db = await getDatabase();
  return db.select<ChartRow[]>(`SELECT d.id AS diary_id, d.diary_name, n.id AS note_id,
    date(n.created_at, '+7 hours') AS local_date, COUNT(DISTINCT l.id) AS leaf_count,
    AVG(l.nitrogen_deficiency) AS avg_nitrogen,
    COUNT(DISTINCT dr.id) AS disease_count,
    GROUP_CONCAT(DISTINCT json_each.value ->> '$.class') AS disease_names
    FROM diaries_table d
    LEFT JOIN diary_notes n ON n.diary_id = d.id
    LEFT JOIN leaves l ON l.note_id = n.id
    LEFT JOIN disease_detection_results dr ON dr.note_id = n.id AND dr.status = 'complete'
    LEFT JOIN json_each(dr.result_json, '$.predictions')
    GROUP BY d.id, n.id ORDER BY local_date`);
}

export async function analyzeNoteForDiseases(noteId: string, leafPaths: string[], onProgress?: (message: string) => void): Promise<void> {
  if (!leafPaths.length) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await Promise.all(leafPaths.map((path) => saveDiseaseResult(noteId, path, "offline", null)));
    onProgress?.("Không có kết nối mạng — đã bỏ qua nhận diện bệnh.");
    return;
  }
  for (let index = 0; index < leafPaths.length; index += 1) {
    const path = leafPaths[index];
    onProgress?.(`Đang nhận diện bệnh trên lá ${index + 1}/${leafPaths.length}…`);
    try {
      const result = await detectDiseases(path);
      if (!Array.isArray(result.predictions)) throw new Error("Phản hồi nhận diện không hợp lệ.");
      await saveDiseaseResult(noteId, path, "complete", result);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      await saveDiseaseResult(noteId, path, offline ? "offline" : "failed", null, message);
    }
  }
}
