import Database from "@tauri-apps/plugin-sql";
import {
  detectDiseases,
  type DiseaseDetectionResult,
  type DiseasePrediction,
} from "./ai";

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

export type LeafRow = {
  leaf_id: string;
  note_id: string;
  diary_id: string;
  diary_name: string;
  local_date: string;
  file_path: string;
  nitrogen_deficiency: number;
};

/** Kết quả nhận diện đã được giải mã cho một lá. */
export type DiseaseLeaf = {
  result_id: string;
  note_id: string;
  diary_id: string;
  diary_name: string;
  local_date: string;
  leaf_path: string;
  predictions: DiseasePrediction[];
  image?: { width: number; height: number };
};

export type ParsedDetection = {
  leaf_path: string;
  status: DiseaseResultRecord["status"];
  predictions: DiseasePrediction[];
  image?: { width: number; height: number };
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  streakEnabled: true,
  streakFrequencyHours: 24,
  tipsEnabled: false,
  reminderTime: "09:00",
};

let database: Promise<Database> | null = null;
async function getDatabase() {
  database ??= Database.load("sqlite:rice_diary.sqlite");
  console.log(database);
  return database;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM app_settings",
  );
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return {
    theme: values.theme || DEFAULT_SETTINGS.theme,
    streakEnabled:
      values.streakEnabled === undefined
        ? DEFAULT_SETTINGS.streakEnabled
        : values.streakEnabled === "true",
    streakFrequencyHours: Math.max(
      1,
      Math.min(
        168,
        Number(values.streakFrequencyHours) ||
          DEFAULT_SETTINGS.streakFrequencyHours,
      ),
    ),
    tipsEnabled:
      values.tipsEnabled === undefined
        ? DEFAULT_SETTINGS.tipsEnabled
        : values.tipsEnabled === "true",
    reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(values.reminderTime || "")
      ? values.reminderTime
      : DEFAULT_SETTINGS.reminderTime,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  for (const [key, value] of Object.entries(settings)) {
    await db.execute(
      "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, String(value)],
    );
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("rice-diary-settings-changed"));
}

export async function saveDiseaseResult(
  noteId: string,
  leafPath: string,
  status: DiseaseResultRecord["status"],
  result: DiseaseDetectionResult | null,
  error: string | null = null,
) {
  const db = await getDatabase();
  await db.execute(
    "INSERT INTO disease_detection_results (id, note_id, leaf_path, status, result_json, error) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      crypto.randomUUID(),
      noteId,
      leafPath,
      status,
      result ? JSON.stringify(result) : null,
      error,
    ],
  );
}

/** Xóa kết quả cũ của ghi chú trước khi nhận diện lại (tránh trùng lặp). */
export async function clearDiseaseResults(noteId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM disease_detection_results WHERE note_id = $1", [
    noteId,
  ]);
}

export async function loadDiseaseResults(
  noteId: string,
): Promise<DiseaseResultRecord[]> {
  const db = await getDatabase();
  return db.select<DiseaseResultRecord[]>(
    "SELECT id, note_id, leaf_path, status, result_json, error, created_at FROM disease_detection_results WHERE note_id = $1 ORDER BY created_at",
    [noteId],
  );
}

function parseResultJson(json: string | null): DiseaseDetectionResult | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as DiseaseDetectionResult;
    return Array.isArray(data.predictions) ? data : null;
  } catch {
    return null;
  }
}

export function parseDetection(record: DiseaseResultRecord): ParsedDetection {
  const data =
    record.status === "complete" ? parseResultJson(record.result_json) : null;
  return {
    leaf_path: record.leaf_path,
    status: record.status,
    predictions: data?.predictions ?? [],
    image: data?.image,
  };
}

export async function loadChartRows(): Promise<ChartRow[]> {
  const db = await getDatabase();
  return db.select<
    ChartRow[]
  >(`SELECT d.id AS diary_id, d.diary_name, n.id AS note_id,
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

/** Tất cả lá kèm điểm thiếu đạm (dùng cho biểu đồ phân bố). */
export async function loadLeafRows(diaryId?: string): Promise<LeafRow[]> {
  const db = await getDatabase();
  const where = diaryId ? "WHERE d.id = $1" : "";
  return db.select<LeafRow[]>(
    `SELECT l.id AS leaf_id, l.note_id, d.id AS diary_id, d.diary_name,
      date(n.created_at, '+7 hours') AS local_date, l.file_path, l.nitrogen_deficiency
      FROM leaves l
      JOIN diary_notes n ON n.id = l.note_id
      JOIN diaries_table d ON d.id = n.diary_id
      ${where}
      ORDER BY n.created_at`,
    diaryId ? [diaryId] : [],
  );
}

/** Kết quả nhận diện (mỗi lá lấy kết quả mới nhất, chỉ trạng thái hoàn tất). */
export async function loadDiseaseLeaves(
  diaryId?: string,
): Promise<DiseaseLeaf[]> {
  const db = await getDatabase();
  const where = diaryId ? "AND d.id = $1" : "";
  const rows = await db.select<
    {
      result_id: string;
      note_id: string;
      diary_id: string;
      diary_name: string;
      local_date: string;
      leaf_path: string;
      result_json: string | null;
    }[]
  >(
    `SELECT dr.id AS result_id, dr.note_id, d.id AS diary_id, d.diary_name,
      date(n.created_at, '+7 hours') AS local_date, dr.leaf_path, dr.result_json
      FROM disease_detection_results dr
      JOIN diary_notes n ON n.id = dr.note_id
      JOIN diaries_table d ON d.id = n.diary_id
      WHERE dr.status = 'complete' ${where}
      ORDER BY dr.created_at`,
    diaryId ? [diaryId] : [],
  );
  const latest = new Map<string, DiseaseLeaf>();
  for (const row of rows) {
    const data = parseResultJson(row.result_json);
    if (!data) continue;
    latest.set(`${row.note_id}|${row.leaf_path}`, {
      result_id: row.result_id,
      note_id: row.note_id,
      diary_id: row.diary_id,
      diary_name: row.diary_name,
      local_date: row.local_date,
      leaf_path: row.leaf_path,
      predictions: data.predictions,
      image: data.image,
    });
  }
  return Array.from(latest.values()).sort((a, b) =>
    a.local_date.localeCompare(b.local_date),
  );
}

export async function analyzeNoteForDiseases(
  noteId: string,
  leafPaths: string[],
  onProgress?: (message: string) => void,
): Promise<void> {
  if (!leafPaths.length) return;
  await clearDiseaseResults(noteId);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await Promise.all(
      leafPaths.map((path) => saveDiseaseResult(noteId, path, "offline", null)),
    );
    onProgress?.("Không có kết nối mạng — đã bỏ qua nhận diện bệnh.");
    return;
  }
  for (let index = 0; index < leafPaths.length; index += 1) {
    const path = leafPaths[index];
    onProgress?.(
      `Đang nhận diện bệnh trên lá ${index + 1}/${leafPaths.length}…`,
    );
    try {
      const result = await detectDiseases(path);
      if (!Array.isArray(result.predictions))
        throw new Error("Phản hồi nhận diện không hợp lệ.");
      await saveDiseaseResult(noteId, path, "complete", result);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      await saveDiseaseResult(
        noteId,
        path,
        offline ? "offline" : "failed",
        null,
        message,
      );
    }
  }
  onProgress?.("Đã nhận diện xong.");
}
