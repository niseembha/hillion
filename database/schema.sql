PRAGMA foreign_keys = ON;
CREATE TABLE students (
 id TEXT PRIMARY KEY,
 display_name TEXT NOT NULL,
 first_name TEXT NOT NULL,
 class_year INTEGER NOT NULL
);
CREATE TABLE mysteries (
 id TEXT PRIMARY KEY,
 play_date TEXT UNIQUE, -- YYYY-MM-DD in the chosen school timezone; NULL for prototype
 student_id TEXT NOT NULL REFERENCES students(id),
 edition_number INTEGER NOT NULL UNIQUE,
 content_status TEXT NOT NULL CHECK(content_status IN ('placeholder','draft','published')),
 title TEXT NOT NULL,
 published_at TEXT
);
CREATE INDEX mysteries_student ON mysteries(student_id);
CREATE TABLE mystery_clues (
 mystery_id TEXT NOT NULL REFERENCES mysteries(id),
 position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 7),
 label TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 PRIMARY KEY(mystery_id,position)
);
-- Snapshot candidates per edition so roster changes cannot alter archived play.
CREATE TABLE mystery_candidates (
 mystery_id TEXT NOT NULL REFERENCES mysteries(id),
 student_id TEXT NOT NULL REFERENCES students(id),
 display_name TEXT NOT NULL,
 PRIMARY KEY(mystery_id,student_id)
);
