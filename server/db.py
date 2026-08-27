"""SQLite schema and access helpers.

Deliberately plain sqlite3 rather than an ORM: the schema is small, the
queries are the interesting part, and there is nothing here an ORM would
make clearer.
"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(os.environ.get("VERSINE_DB", "data/progress.db"))

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    pin_hash    TEXT NOT NULL,
    pin_salt    TEXT NOT NULL,
    accent      TEXT NOT NULL DEFAULT '#35d6ff',
    icon        TEXT NOT NULL DEFAULT '🦊',
    xp          INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

-- Highest level unlocked per skill, plus which levels were passed outright.
CREATE TABLE IF NOT EXISTS skill_progress (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id  TEXT    NOT NULL,
    level      INTEGER NOT NULL DEFAULT 0,
    mastered  TEXT    NOT NULL DEFAULT '[]',
    solved    INTEGER NOT NULL DEFAULT 0,
    level_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS best_scores (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    TEXT    NOT NULL,
    mode_id     TEXT    NOT NULL,
    level        INTEGER NOT NULL,
    points      INTEGER NOT NULL,
    achieved_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, skill_id, mode_id)
);

-- One row per completed run.
CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    TEXT    NOT NULL,
    level        INTEGER NOT NULL,
    mode_id     TEXT    NOT NULL,
    points      INTEGER NOT NULL,
    solved      INTEGER NOT NULL,
    answered    INTEGER NOT NULL,
    misses      INTEGER NOT NULL,
    accuracy    REAL    NOT NULL,
    best_streak INTEGER NOT NULL,
    avg_seconds REAL    NOT NULL,
    passed      INTEGER NOT NULL DEFAULT 0,
    end_reason  TEXT,
    ended_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_user_time ON runs(user_id, ended_at DESC);

-- Append-only: one row per problem answered, ever. Nothing reads this yet
-- beyond the teacher console, but it is the only record that cannot be
-- reconstructed after the fact.
CREATE TABLE IF NOT EXISTS attempts (
    id        INTEGER PRIMARY KEY,
    run_id    INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id  TEXT    NOT NULL,
    level      INTEGER NOT NULL,
    prompt    TEXT    NOT NULL,
    expected  TEXT    NOT NULL,
    correct   INTEGER NOT NULL,
    ms        INTEGER NOT NULL,
    tags      TEXT    NOT NULL DEFAULT '[]',
    at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_skill ON attempts(user_id, skill_id);

-- The Time Trial clock, per student per level. Seeded from how fast they
-- practised, then nudged after every trial. Never hand-set.
CREATE TABLE IF NOT EXISTS level_clocks (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id   TEXT    NOT NULL,
    level      INTEGER NOT NULL,
    duration   INTEGER NOT NULL,
    runs       INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, skill_id, level)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def cursor(commit: bool = False):
    conn = connect()
    try:
        yield conn
        if commit:
            conn.commit()
    finally:
        conn.close()


def ensure_column(conn: sqlite3.Connection, table: str, column: str, decl: str) -> None:
    """Add a column to an existing table if it isn't there yet.

    CREATE TABLE IF NOT EXISTS silently skips tables that already exist, so
    schema additions need this to reach databases created by older versions.
    """
    existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def init_db() -> None:
    with cursor(commit=True) as conn:
        conn.executescript(SCHEMA)
        ensure_column(conn, "users", "icon", "TEXT NOT NULL DEFAULT '🦊'")
        ensure_column(conn, "skill_progress", "level_count", "INTEGER NOT NULL DEFAULT 0")


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def done_today(conn: sqlite3.Connection, user_id: int) -> set[str]:
    """Skills finished for the day.

    A skill counts as done only once its last level -- the mixed review that draws on
    every earlier level -- has been cleared in a Time Trial today. Practising
    an easy level all afternoon does not tick the box.
    """
    rows = conn.execute(
        """SELECT DISTINCT r.skill_id
           FROM runs r JOIN skill_progress p
             ON p.user_id = r.user_id AND p.skill_id = r.skill_id
           WHERE r.user_id = ? AND r.mode_id = 'trial' AND r.passed = 1
             AND p.level_count > 0 AND r.level = p.level_count - 1
             AND date(r.ended_at) = date('now')""",
        (user_id,),
    )
    return {r["skill_id"] for r in rows}


def get_clocks(conn: sqlite3.Connection, user_id: int) -> dict:
    """Personal Time Trial clocks, keyed "skill:level"."""
    return {
        f"{r['skill_id']}:{r['level']}": {"duration": r["duration"], "runs": r["runs"]}
        for r in conn.execute(
            "SELECT skill_id, level, duration, runs FROM level_clocks WHERE user_id = ?",
            (user_id,),
        )
    }


def get_progress(conn: sqlite3.Connection, user_id: int) -> dict:
    """Everything the client needs to draw the map for one user."""
    finished = done_today(conn, user_id)
    skills: dict[str, dict] = {}
    for r in conn.execute(
        "SELECT skill_id, level, mastered, solved, level_count FROM skill_progress WHERE user_id = ?",
        (user_id,),
    ):
        skills[r["skill_id"]] = {
            "level": r["level"],
            "mastered": json.loads(r["mastered"]),
            "solved": r["solved"],
            "levelCount": r["level_count"],
            "doneToday": r["skill_id"] in finished,
            "best": {},
        }

    for r in conn.execute(
        "SELECT skill_id, mode_id, points FROM best_scores WHERE user_id = ?", (user_id,)
    ):
        skills.setdefault(
            r["skill_id"],
            {"level": 0, "mastered": [], "solved": 0, "levelCount": 0,
             "doneToday": False, "best": {}},
        )["best"][r["mode_id"]] = r["points"]

    xp = conn.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()["xp"]
    return {"xp": xp, "skills": skills}
