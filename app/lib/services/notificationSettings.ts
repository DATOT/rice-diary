import Database from "@tauri-apps/plugin-sql";

export const TIP_FREQUENCY_OPTIONS = [6, 24, 72, 168] as const;
export type TipFrequencyHours = (typeof TIP_FREQUENCY_OPTIONS)[number];

const DEFAULT_TIP_FREQUENCY_HOURS: TipFrequencyHours = 24;
const TIP_FREQUENCY_KEY = "tipsFrequencyHours";

let database: Promise<Database> | null = null;

async function getDatabase() {
  database ??= Database.load("sqlite:rice_diary.sqlite");
  return database;
}

export async function loadTipFrequencyHours(): Promise<TipFrequencyHours> {
  const db = await getDatabase();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [TIP_FREQUENCY_KEY],
  );
  const frequency = Number(rows[0]?.value);

  return TIP_FREQUENCY_OPTIONS.includes(
    frequency as TipFrequencyHours,
  )
    ? (frequency as TipFrequencyHours)
    : DEFAULT_TIP_FREQUENCY_HOURS;
}

export async function saveTipFrequencyHours(
  frequency: TipFrequencyHours,
): Promise<void> {
  if (!TIP_FREQUENCY_OPTIONS.includes(frequency)) {
    throw new Error("Tần suất nhắc mẹo không hợp lệ.");
  }

  const db = await getDatabase();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [TIP_FREQUENCY_KEY, String(frequency)],
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("rice-diary-settings-changed"));
  }
}
