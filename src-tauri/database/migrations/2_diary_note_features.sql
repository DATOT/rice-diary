ALTER TABLE diaries_table ADD COLUMN description TEXT;
ALTER TABLE diaries_table ADD COLUMN is_dead INTEGER NOT NULL DEFAULT 0;
ALTER TABLE diaries_table ADD COLUMN allow_dead_notes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE diary_notes ADD COLUMN thought TEXT;
