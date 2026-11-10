CREATE TABLE IF NOT EXISTS "diaries_table" (
	"id" TEXT NOT NULL,
	"diary_name" TEXT NOT NULL,
	"thumbnail_path" TEXT,
	"current_streak" INTEGER NOT NULL DEFAULT 0,
	"longest_streak" INTEGER NOT NULL DEFAULT 0,
	"last_active_date" INTEGER NOT NULL,
	"created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "diary_notes" (
	"id" TEXT NOT NULL,
	"diary_id" TEXT NOT NULL,
	"thumbnail_path" TEXT,
	"created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY ("diary_id") REFERENCES "diaries_table"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_diary_notes_diary_id"
ON "diary_notes" ("diary_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_diary_notes_diary_date"
ON "diary_notes" ("diary_id", "note_date");
CREATE TABLE IF NOT EXISTS "leaves" (
	"id" TEXT NOT NULL,
	"note_id" TEXT NOT NULL,
	"file_path" TEXT NOT NULL,
	"nitrogen_deficiency" REAL NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY ("note_id") REFERENCES "diary_notes"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_leaves_analysis_id"
ON "leaves" ("note_id");

CREATE UNIQUE INDEX IF NOT EXISTS uq_diary_notes_diary_date
ON diary_notes (
    diary_id,
    date(created_at, '+7 hours')
);