# Students and dated mysteries

The updated supplied excerpt contains **128 unique names**, including the 28 absent from the first paste. All 128 names are imported verbatim, including accents and compound surnames. The original 100 student IDs are preserved. Emails, account messages, directory filters and contact information are excluded.

`src/data/students.js` holds stable student IDs, display names, first names and class years. Keep IDs unchanged when correcting spelling. `src/data/cases.js` owns each edition's answer reference and independent seven-clue snapshot. The current case is `prototype-001`, answer `niseem-bhattacharya`, with `date: null` and `contentStatus: placeholder`. No release date was invented. All seven clue objects are unchanged. The old portrait and invented biography are replaced by an initials placeholder and a clear prototype notice.

`src/data.js` is the compatibility facade used by the game. It resolves the current prototype and exposes `getMystery(date)` for a dated edition, returning null when absent. Roster lookups and dated case selection are separated from rendering and scoring. There is no database service or archive UI yet; this is the organized local content layer for the current prototype.

`database/schema.sql` describes the future SQLite/D1 structure: students, editions keyed by unique play date, ordered clues and per-edition candidate snapshots. Before publication, the server should validate exactly seven clues, answer membership, timezone/date validity and approved content, then publish the edition and candidate snapshot in one transaction. Published clue text and names should be immutable snapshots; corrections require explicit versioning. Retain student IDs instead of deleting referenced records.

For the eventual archive, fetch a published edition by ISO date; persist player progress by mystery ID and content version, rather than a single global round. Resolve today's date in an explicit school timezone. Keep answers server-side and submit guesses to a server endpoint. The present static prototype bundles its answer and cannot provide spoiler protection. Adding backend storage, daily scheduling, authenticated publishing, archive navigation and persistent replay is future work, not functionality claimed in this pass.

The existing private Site audience is preserved. No email addresses are deployed.
