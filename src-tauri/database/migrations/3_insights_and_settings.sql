CREATE TABLE disease_detection_results (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL,
  leaf_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'offline', 'failed')),
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES diary_notes(id) ON DELETE CASCADE
);
CREATE INDEX idx_disease_results_note ON disease_detection_results(note_id);
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
